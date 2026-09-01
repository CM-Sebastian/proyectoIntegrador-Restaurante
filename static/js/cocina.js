/**
 * FentchFood — interfaz Cocina
 * Muestra los pedidos activos agrupados por estado y permite avanzarlos.
 * Depende de FF (main.js).
 */
(() => {
  const INTERVALO_MS = 8000;

  const estado = {
    ordenes: [], detalle: [], platillos: [], mesas: [], estadosOrden: FF.ESTADOS_ORDEN_RESPALDO,
    pausado: false, mostrandoHistorial: false, temporizador: null,
  };

  const elColPendiente = document.getElementById('lista-pendiente');
  const elColPreparando = document.getElementById('lista-preparando');
  const elColListo = document.getElementById('lista-listo');
  const elContPendiente = document.getElementById('contador-pendiente');
  const elContPreparando = document.getElementById('contador-preparando');
  const elContListo = document.getElementById('contador-listo');
  const elBotonHistorial = document.getElementById('boton-historial');
  const elTablero = document.getElementById('tablero-cocina');
  const elHistorial = document.getElementById('panel-historial');
  const elListaHistorial = document.getElementById('lista-historial');
  const elBotonPausa = document.getElementById('boton-pausa');
  const elPuntoEnVivo = document.getElementById('punto-en-vivo');
  const elUltimaActualizacion = document.getElementById('ultima-actualizacion');
  const elAnuncio = document.getElementById('anuncio-cocina');

  function idOrden(o) { return o.orden_id ?? o.id; }
  function idPlatillo(p) { return p.platillo_id ?? p.id; }
  function idMesa(m) { return m.mesa_id ?? m.id; }

  function nombreEstado(idEstado) {
    const encontrado = estado.estadosOrden.find(e => (e.estado_orden_id ?? e.id) === Number(idEstado));
    return encontrado ? encontrado.nombre : `Estado ${idEstado}`;
  }

  async function cargarCatalogosBase() {
    try { estado.estadosOrden = await FF.api.listarEstadosOrden(); } catch (_) { /* usa el respaldo */ }
    try { estado.platillos = await FF.api.listarPlatillos(); } catch (e) { console.error(e); }
    try { estado.mesas = await FF.api.listarMesas(); } catch (e) { console.error(e); }
  }

  async function actualizar() {
    try {
      const [ordenes, detalle] = await Promise.all([
        FF.api.listarOrdenes(),
        FF.api.listarDetalleOrdenes().catch(() => []),
      ]);
      estado.ordenes = ordenes;
      estado.detalle = detalle;
      renderizarTablero();
      renderizarHistorial();
      const ahora = new Date();
      elUltimaActualizacion.textContent = `Actualizado a las ${ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      elUltimaActualizacion.textContent = 'No se pudo actualizar. Reintentando…';
      console.error(error);
    }
  }

  function itemsDeOrden(orden) {
    const lineas = estado.detalle.filter(d => d.orden_id === idOrden(orden));
    if (!lineas.length) return ['Sin detalle disponible'];
    return lineas.map(l => {
      const plato = estado.platillos.find(p => idPlatillo(p) === l.platillo_id);
      return `${l.cantidad}× ${plato ? plato.nombre : `Platillo #${l.platillo_id}`}`;
    });
  }

  function numeroMesaDe(orden) {
    const mesa = estado.mesas.find(m => idMesa(m) === orden.mesa_id);
    return mesa ? mesa.numero_mesa : orden.mesa_id;
  }

  function claseTiempo(minutos) {
    if (minutos < 10) return 'normal';
    if (minutos < 20) return 'atencion';
    return 'urgente';
  }

  function crearTarjeta(orden, tipoColumna) {
    const { minutos, texto } = FF.tiempoTranscurrido(orden.fecha_hora);
    const clase = claseTiempo(minutos);
    const li = document.createElement('li');
    li.className = `tarjeta-pedido tarjeta-pedido--${tipoColumna}`;
    li.innerHTML = `
      <div class="tarjeta-pedido__cabecera">
        <span class="badge badge-neutro">Mesa #${numeroMesaDe(orden)}</span>
        <span class="badge badge-neutro">Pedido #${idOrden(orden)}</span>
      </div>
      <ul class="tarjeta-pedido__items">${itemsDeOrden(orden).map(t => `<li>${t}</li>`).join('')}</ul>
      <div class="tarjeta-pedido__pie">
        <span class="tarjeta-pedido__tiempo tarjeta-pedido__tiempo--${clase}">
          ⏱ ${texto}${clase === 'urgente' ? ' — ¡atender pronto!' : ''}
        </span>
      </div>
    `;
    const pie = li.querySelector('.tarjeta-pedido__pie');
    const accionBtn = document.createElement('button');
    accionBtn.type = 'button';
    accionBtn.className = 'btn btn-sm btn-primario';
    if (tipoColumna === 'pendiente') {
      accionBtn.textContent = 'Preparar';
      accionBtn.setAttribute('aria-label', `Mover pedido #${idOrden(orden)} de la mesa ${numeroMesaDe(orden)} a Preparando`);
      accionBtn.addEventListener('click', () => avanzarOrden(orden, 2));
    } else if (tipoColumna === 'preparando') {
      accionBtn.textContent = 'Listo';
      accionBtn.setAttribute('aria-label', `Marcar pedido #${idOrden(orden)} de la mesa ${numeroMesaDe(orden)} como Listo`);
      accionBtn.addEventListener('click', () => avanzarOrden(orden, 3));
    } else {
      accionBtn.textContent = 'Entregado';
      accionBtn.setAttribute('aria-label', `Marcar pedido #${idOrden(orden)} de la mesa ${numeroMesaDe(orden)} como Entregado`);
      accionBtn.addEventListener('click', () => avanzarOrden(orden, 4));
    }
    pie.appendChild(accionBtn);
    return li;
  }

  async function avanzarOrden(orden, nuevoEstadoId) {
    try {
      await FF.api.actualizarOrden(idOrden(orden), { estado_orden_id: nuevoEstadoId });
      FF.notificar(`Pedido #${idOrden(orden)} → ${nombreEstado(nuevoEstadoId)}`);
      await actualizar();
    } catch (error) {
      FF.notificar(error.message || 'No se pudo actualizar el pedido.');
    }
  }

  function renderizarTablero() {
    const pendientes = estado.ordenes.filter(o => Number(o.estado_orden_id) === 1).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    const preparando = estado.ordenes.filter(o => Number(o.estado_orden_id) === 2).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    const listos = estado.ordenes.filter(o => Number(o.estado_orden_id) === 3).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

    llenarColumna(elColPendiente, pendientes, 'pendiente', 'No hay pedidos pendientes.');
    llenarColumna(elColPreparando, preparando, 'preparando', 'Nada en preparación.');
    llenarColumna(elColListo, listos, 'listo', 'Nada listo por servir.');

    elContPendiente.textContent = pendientes.length;
    elContPreparando.textContent = preparando.length;
    elContListo.textContent = listos.length;

    elAnuncio.textContent = `${pendientes.length} pedidos pendientes, ${preparando.length} en preparación, ${listos.length} listos.`;
  }

  function llenarColumna(contenedor, ordenes, tipo, mensajeVacio) {
    contenedor.innerHTML = '';
    if (!ordenes.length) {
      contenedor.innerHTML = `<li class="estado-vacio">${mensajeVacio}</li>`;
      return;
    }
    ordenes.forEach(o => contenedor.appendChild(crearTarjeta(o, tipo)));
  }

  function renderizarHistorial() {
    const historial = estado.ordenes
      .filter(o => [4, 5].includes(Number(o.estado_orden_id)))
      .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
      .slice(0, 30);
    if (!historial.length) {
      elListaHistorial.innerHTML = '<li class="estado-vacio">Todavía no hay pedidos entregados o cancelados.</li>';
      return;
    }
    elListaHistorial.innerHTML = '';
    historial.forEach(o => {
      const li = document.createElement('li');
      li.className = 'tarjeta-pedido';
      li.style.borderLeftColor = Number(o.estado_orden_id) === 4 ? 'var(--estado-libre-bg)' : 'var(--estado-ocupada-bg)';
      li.innerHTML = `
        <div class="tarjeta-pedido__cabecera">
          <span class="badge badge-neutro">Mesa #${numeroMesaDe(o)}</span>
          <span class="badge badge-neutro">Pedido #${idOrden(o)}</span>
        </div>
        <ul class="tarjeta-pedido__items">${itemsDeOrden(o).map(t => `<li>${t}</li>`).join('')}</ul>
        <p class="badge ${Number(o.estado_orden_id) === 4 ? 'badge-libre' : 'badge-ocupada'}">${nombreEstado(o.estado_orden_id)}</p>
      `;
      elListaHistorial.appendChild(li);
    });
  }

  function alternarHistorial() {
    estado.mostrandoHistorial = !estado.mostrandoHistorial;
    elHistorial.classList.toggle('oculto', !estado.mostrandoHistorial);
    elTablero.classList.toggle('oculto', estado.mostrandoHistorial);
    elBotonHistorial.setAttribute('aria-pressed', String(estado.mostrandoHistorial));
    elBotonHistorial.textContent = estado.mostrandoHistorial ? 'Ver pedidos activos' : 'Ver historial';
  }

  function alternarPausa() {
    estado.pausado = !estado.pausado;
    elPuntoEnVivo.dataset.pausado = String(estado.pausado);
    elBotonPausa.setAttribute('aria-pressed', String(estado.pausado));
    elBotonPausa.textContent = estado.pausado ? 'Reanudar actualización automática' : 'Pausar actualización automática';
    if (estado.pausado) {
      clearInterval(estado.temporizador);
      estado.temporizador = null;
    } else {
      iniciarSondeo();
    }
  }

  function iniciarSondeo() {
    if (estado.temporizador) clearInterval(estado.temporizador);
    estado.temporizador = setInterval(actualizar, INTERVALO_MS);
  }

  async function iniciar() {
    await cargarCatalogosBase();
    await actualizar();
    iniciarSondeo();
    elBotonHistorial.addEventListener('click', alternarHistorial);
    elBotonPausa.addEventListener('click', alternarPausa);
  }

  iniciar();
})();
