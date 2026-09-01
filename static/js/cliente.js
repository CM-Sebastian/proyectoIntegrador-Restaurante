/**
 * FentchFood — interfaz Cliente (móvil, se abre al escanear el QR de la mesa)
 * Depende de FF (main.js). Debe cargarse después de main.js.
 */
(() => {
  const ICONOS_CATEGORIA = {
    hamburguesas: '',
    bebidas: '',
    acompañamientos: '',
    acompanamientos: '',
    postres: '',
    default: '',
  };

  const params = new URLSearchParams(window.location.search);
  const numeroMesa = Number(params.get('mesa')) || 1;

  const estado = {
    categorias: [],
    platillos: [],
    categoriaActiva: 'populares',
    carrito: cargarCarrito(),
    metodoPago: 'tarjeta',
    ultimaConfirmacion: null,
    pedidoActivo: false,
    pasoActual: 1,
    sondeoId: null,
    temporizadorId: null,
  };

  const METODO_PAGO_ID = { tarjeta: 2, qr: 3, efectivo: 1 };

  // --- Referencias DOM ---
  const elMesa = document.getElementById('num-mesa');
  const elMesa2 = document.getElementById('num-mesa-2');
  const elTabs = document.getElementById('tabs-categorias');
  const elPlatos = document.getElementById('contenedor-platos');
  const elTituloSeccion = document.getElementById('titulo-seccion-platos');
  const elBarraCarrito = document.getElementById('barra-carrito');
  const elBotonCarrito = document.getElementById('boton-abrir-carrito');
  const elContadorCarrito = document.getElementById('contador-carrito');
  const elTotalCarritoBarra = document.getElementById('total-carrito-barra');

  const elModalCarrito = document.getElementById('modal-carrito');
  const elListaCarrito = document.getElementById('lista-carrito');
  const elTotalCarrito = document.getElementById('total-carrito');
  const elFormPago = document.getElementById('form-pago');
  const elBotonConfirmar = document.getElementById('boton-confirmar-pedido');
  const elCerrarCarrito = document.getElementById('cerrar-carrito');

  const elVistaMenu = document.getElementById('vista-menu');
  const elVistaEstado = document.getElementById('vista-estado');
  const elEstadoIcono = document.getElementById('estado-icono');
  const elEstadoTitulo = document.getElementById('estado-titulo');
  const elResumenPedido = document.getElementById('resumen-pedido');
  const elVolverMenu = document.getElementById('volver-menu');
  
  const elEstadoSubtitulo = document.getElementById('estado-subtitulo');


  const elBarraProgreso = document.getElementById('barra-progreso');
  const elProgresoRelleno = document.getElementById('progreso-relleno');
  const elProgresoTexto = document.getElementById('progreso-texto');
  const elProgresoNum = document.getElementById('progreso-num');
  const elAnuncioCarrito = document.getElementById('anuncio-carrito');

  const elModalAyuda = document.getElementById('modal-ayuda');
  const elBotonAyuda = document.getElementById('boton-ayuda');
  const elCerrarAyuda = document.getElementById('cerrar-ayuda');
  const elEntendidoAyuda = document.getElementById('entendido-ayuda');

  let liberarFocoModal = null;
  let disparadorModal = null;

  function claveCarrito() { return `ff_carrito_mesa_${numeroMesa}`; }
  function cargarCarrito() {
    try { return JSON.parse(sessionStorage.getItem(`ff_carrito_mesa_${numeroMesa}`)) || []; }
    catch (_) { return []; }
  }
  function guardarCarrito() { sessionStorage.setItem(claveCarrito(), JSON.stringify(estado.carrito)); }

  function iconoPara(nombreCategoria) {
    const clave = (nombreCategoria || '').toLowerCase().trim();
    return ICONOS_CATEGORIA[clave] || ICONOS_CATEGORIA.default;
  }

  // --- Carga inicial ---
  async function iniciar() {
    if (elMesa) elMesa.textContent = numeroMesa;
    if (elMesa2) elMesa2.textContent = numeroMesa;
    try {
      const [categorias, platillos] = await Promise.all([
        FF.api.listarCategorias(),
        FF.api.listarPlatillos(),
      ]);
      estado.categorias = categorias;
      estado.platillos = platillos;
      await marcarRecomendados();
      renderizarTabs();
      renderizarPlatos();
    } catch (error) {
      elPlatos.innerHTML = `<p role="alert">No se pudo cargar el menú. Verifica tu conexión e inténtalo de nuevo.</p>`;
      console.error(error);
    }
    renderizarBarraCarrito();
    recuperarSeguimientoSiExiste();
    configurarEventos();
  }

  async function marcarRecomendados() {
    try {
      const detalle = await FF.api.listarDetalleOrdenes();
      const conteo = {};
      detalle.forEach(linea => {
        conteo[linea.platillo_id] = (conteo[linea.platillo_id] || 0) + Number(linea.cantidad || 0);
      });
      const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => Number(id));
      estado.platillos.forEach(p => { p._recomendado = top.includes(p.platillo_id ?? p.id); });
    } catch (_) {
      // Sin historial de ventas todavía (restaurante nuevo): no pasa nada,
      // simplemente no se marcan recomendados.
    }
  }

  function idPlatillo(p) { return p.platillo_id ?? p.id; }
  function idCategoria(c) { return c.categoria_id ?? c.id; }

  function renderizarTabs() {
    const botones = [{ id: 'populares', nombre: 'Populares' }, ...estado.categorias.map(c => ({ id: String(idCategoria(c)), nombre: c.nombre }))];
    elTabs.innerHTML = '';
    botones.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-categoria';
      btn.id = `tab-${cat.id}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(cat.id === estado.categoriaActiva));
      btn.setAttribute('aria-controls', 'contenedor-platos');
      btn.textContent = cat.nombre;
      btn.addEventListener('click', () => {
        estado.categoriaActiva = cat.id;
        renderizarTabs();
        renderizarPlatos();
      });
      elTabs.appendChild(btn);
    });
  }

  function platosVisibles() {
    if (estado.categoriaActiva === 'populares') {
      const recomendados = estado.platillos.filter(p => p._recomendado);
      return recomendados.length ? recomendados : estado.platillos.slice(0, 4);
    }
    return estado.platillos.filter(p => String(p.categoria_id) === estado.categoriaActiva);
  }

  function renderizarPlatos() {
    const platos = platosVisibles();
    const categoriaObj = estado.categorias.find(c => String(idCategoria(c)) === estado.categoriaActiva);
    elTituloSeccion.textContent = estado.categoriaActiva === 'populares' ? 'Platos populares' : (categoriaObj ? categoriaObj.nombre : 'Menú');

    if (!platos.length) {
      elPlatos.innerHTML = '<p>No hay platillos disponibles en esta categoría por ahora.</p>';
      return;
    }

    elPlatos.innerHTML = '';
    platos.forEach(plato => {
      const id = idPlatillo(plato);
      const agotado = Number(plato.stock_disponible) <= 0 || plato.activo === false;
      const enCarrito = estado.carrito.find(l => l.platillo_id === id);
      const categoriaNombre = (estado.categorias.find(c => idCategoria(c) === plato.categoria_id) || {}).nombre;

      const articulo = document.createElement('article');
      articulo.className = 'tarjeta-plato' + (agotado ? ' plato-agotado' : '');
      const figuraContenido = plato.imagen_url
        ? `<img src="${plato.imagen_url}" alt="" class="tarjeta-plato__imagen">`
        : iconoPara(categoriaNombre);

      articulo.innerHTML = `
        ${agotado ? '<span class="etiqueta-agotado">Agotado</span>' : (plato._recomendado ? '<span class="etiqueta-recomendado">Recomendado</span>' : '')}
        <figure class="tarjeta-plato__figura" aria-hidden="true">${figuraContenido}</figure>
        <div class="tarjeta-plato__cuerpo">
          <div class="tarjeta-plato__cabecera">
            <h3>${escapeHtml(plato.nombre)}</h3>
            <span class="tarjeta-plato__precio">${FF.formatoMoneda(plato.precio)}</span>
          </div>
          <p class="tarjeta-plato__desc">${escapeHtml(plato.descripcion || 'Sin descripción disponible.')}</p>
          <div class="tarjeta-plato__pie">
            <span class="badge badge-neutro">${agotado ? 'Sin stock' : `${plato.stock_disponible} disponibles`}</span>
            <div class="acciones-plato" data-id="${id}"></div>
          </div>
        </div>
      `;

      const contenedorAcciones = articulo.querySelector('.acciones-plato');
      if (agotado) {
        contenedorAcciones.innerHTML = `<button class="btn btn-secundario btn-sm" disabled aria-disabled="true">No disponible</button>`;
      } else if (enCarrito) {
        contenedorAcciones.appendChild(crearSelectorCantidad(plato, enCarrito));
      } else {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'btn btn-primario btn-sm';
        boton.textContent = 'Agregar';
        boton.setAttribute('aria-label', `Agregar ${plato.nombre} al carrito`);
        boton.addEventListener('click', () => { agregarAlCarrito(plato); renderizarPlatos(); });
        contenedorAcciones.appendChild(boton);
      }

      elPlatos.appendChild(articulo);
    });
  }

  function crearSelectorCantidad(plato, linea) {
    const id = idPlatillo(plato);
    const cont = document.createElement('div');
    cont.className = 'selector-cantidad';
    cont.innerHTML = `
      <button type="button" aria-label="Quitar una unidad de ${escapeHtml(plato.nombre)}">−</button>
      <output aria-live="polite">${linea.cantidad}</output>
      <button type="button" aria-label="Agregar una unidad más de ${escapeHtml(plato.nombre)}">+</button>
    `;
    const [btnMenos, , btnMas] = cont.children;
    btnMenos.addEventListener('click', () => { cambiarCantidad(id, -1); renderizarPlatos(); });
    btnMas.addEventListener('click', () => {
      const stockMax = Number(plato.stock_disponible);
      if (linea.cantidad >= stockMax) { FF.notificar(`Solo hay ${stockMax} unidades de ${plato.nombre}.`); return; }
      cambiarCantidad(id, 1); renderizarPlatos();
    });
    return cont;
  }

  function agregarAlCarrito(plato) {
    const id = idPlatillo(plato);
    estado.carrito.push({ platillo_id: id, nombre: plato.nombre, precio: Number(plato.precio), cantidad: 1 });
    guardarCarrito();
    renderizarBarraCarrito();
    FF.notificar(`${plato.nombre} agregado al carrito`);
  }

  function cambiarCantidad(platilloId, delta) {
    const linea = estado.carrito.find(l => l.platillo_id === platilloId);
    if (!linea) return;
    linea.cantidad += delta;
    if (linea.cantidad <= 0) estado.carrito = estado.carrito.filter(l => l.platillo_id !== platilloId);
    guardarCarrito();
    renderizarBarraCarrito();
    if (elModalCarrito.dataset.abierta === 'true') renderizarModalCarrito();
  }

  function totalCarrito() { return estado.carrito.reduce((suma, l) => suma + l.precio * l.cantidad, 0); }
  function unidadesCarrito() { return estado.carrito.reduce((suma, l) => suma + l.cantidad, 0); }

 function renderizarBarraCarrito() {
 
  const unidades = unidadesCarrito();
  if (unidades === 0) { elBarraCarrito.classList.add('oculto'); return; }
  elBarraCarrito.classList.remove('oculto');
  elBarraCarrito.classList.toggle('sobre-progreso', !elBarraProgreso.classList.contains('oculto'));
  elContadorCarrito.textContent = unidades;
  elTotalCarritoBarra.textContent = FF.formatoMoneda(totalCarrito());
  elAnuncioCarrito.textContent = `${unidades} producto${unidades === 1 ? '' : 's'} en el carrito, total ${FF.formatoMoneda(totalCarrito())}`;
}

  function renderizarModalCarrito() {
    if (!estado.carrito.length) {
      elListaCarrito.innerHTML = '<p>Tu carrito está vacío. Agrega platillos desde el menú.</p>';
    } else {
      elListaCarrito.innerHTML = '';
      estado.carrito.forEach(linea => {
        const fila = document.createElement('div');
        fila.className = 'fila-pedido';
        fila.innerHTML = `
          <div>
            <strong>${escapeHtml(linea.nombre)}</strong>
            <div class="badge badge-neutro">x${linea.cantidad}</div>
          </div>
          <span class="fila-pedido__precio">${FF.formatoMoneda(linea.precio * linea.cantidad)}</span>
          <button type="button" class="btn btn-fantasma btn-sm" aria-label="Quitar ${escapeHtml(linea.nombre)} del carrito"><img src="/static/img/ICONO-ELIMINAR.png" alt="" class="icono-fila-boton">Quitar</button>
        `;
        fila.querySelector('button').addEventListener('click', () => {
          estado.carrito = estado.carrito.filter(l => l.platillo_id !== linea.platillo_id);
          guardarCarrito();
          renderizarModalCarrito();
          renderizarBarraCarrito();
          renderizarPlatos();
        });
        elListaCarrito.appendChild(fila);
      });
    }
    elTotalCarrito.textContent = FF.formatoMoneda(totalCarrito());
    elBotonConfirmar.disabled = estado.carrito.length === 0;
  }
  function nombrePlatillo(id) {
  const p = estado.platillos.find(pl => idPlatillo(pl) === Number(id));
  return p ? p.nombre : `Platillo #${id}`;
}

function renderizarResumenPedido(lineas) {
  if (!lineas || !lineas.length) { elResumenPedido.innerHTML = ''; return; }
  const total = lineas.reduce((suma, l) => suma + Number(l.subtotal ?? (l.precio_unitario * l.cantidad)), 0);
  elResumenPedido.innerHTML = `
    <h3 class="resumen-pedido__titulo">Tu pedido</h3>
    <ul class="resumen-pedido__lista">
      ${lineas.map(l => `
        <li>
          <span>${escapeHtml(nombrePlatillo(l.platillo_id))} <span class="badge badge-neutro">x${l.cantidad}</span></span>
          <span>${FF.formatoMoneda(l.subtotal ?? (l.precio_unitario * l.cantidad))}</span>
        </li>
      `).join('')}
    </ul>
    <div class="resumen-pedido__total"><span>Total</span><span>${FF.formatoMoneda(total)}</span></div>
  `;
}

  function abrirCarrito(disparador) {
    disparadorModal = disparador || null;
    renderizarModalCarrito();
    elModalCarrito.dataset.abierta = 'true';
    elModalCarrito.querySelector('.hoja-modal__panel').focus();
    liberarFocoModal = FF.atraparFoco(elModalCarrito, cerrarCarrito);
    elBotonCarrito.setAttribute('aria-expanded', 'true');
  }
  function cerrarCarrito() {
    elModalCarrito.dataset.abierta = 'false';
    if (liberarFocoModal) liberarFocoModal();
    elBotonCarrito.setAttribute('aria-expanded', 'false');
    (disparadorModal || elBotonCarrito).focus();
  }

  async function confirmarPedido(evento) {
    evento.preventDefault();
    if (!estado.carrito.length) return;
    elBotonConfirmar.disabled = true;
    elBotonConfirmar.textContent = 'Enviando pedido…';
    const metodoPagoId = METODO_PAGO_ID[estado.metodoPago];
    try {
      for (const linea of estado.carrito) {
        await FF.api.crearOrden({
          numero_mesa: numeroMesa,
          platillo_id: linea.platillo_id,
          cantidad: linea.cantidad,
          metodo_pago_id: metodoPagoId,
        });
      }
   
      const esPrimerPedidoDeLaSesion = !estado.pedidoActivo;
      if (esPrimerPedidoDeLaSesion) {
        estado.ultimaConfirmacion = new Date();
        sessionStorage.setItem(claveSeguimiento(), estado.ultimaConfirmacion.toISOString());
      }
      estado.carrito = [];
      guardarCarrito();
      cerrarCarrito();
      if (esPrimerPedidoDeLaSesion) renderizarResumenPedido([]);
      mostrarPantallaAceptado(esPrimerPedidoDeLaSesion);
      iniciarSondeoEstado();
    } catch (error) {
      FF.notificar(error.message || 'No se pudo registrar el pedido.');
    } finally {
      elBotonConfirmar.disabled = false;
      elBotonConfirmar.textContent = 'Confirmar pedido';
    }
  }

  const MINUTOS_ESTIMADOS_PREPARACION = 20;

  function claveSeguimiento() { return `ff_seguimiento_mesa_${numeroMesa}`; }
  function claveTemporizador() { return `ff_temporizador_mesa_${numeroMesa}`; }

  function mostrarPantallaAceptado(esPrimerPedidoDeLaSesion) {
    estado.pedidoActivo = true;
    elVistaMenu.classList.add('oculto');
    elVistaEstado.classList.remove('oculto');
    elBarraProgreso.classList.remove('oculto');
    renderizarBarraCarrito(); // oculta la barra del carrito mientras haya pedido activo
    if (esPrimerPedidoDeLaSesion) aplicarPaso(1);
  }

  function recuperarSeguimientoSiExiste() {
    const guardado = sessionStorage.getItem(claveSeguimiento());
    if (guardado) {
      estado.ultimaConfirmacion = new Date(guardado);
      estado.pedidoActivo = true;
      elBarraProgreso.classList.remove('oculto');
      renderizarBarraCarrito();
      iniciarSondeoEstado();
    }
  }

  // Los 4 estados de la orden en BD (Pendiente, En Preparación, Listo para Servir, Entregado) 
   
 const PASOS = [
  { paso: 1, texto: 'Pedido recibido en cocina', subtitulo: 'Tu pedido llegó a cocina. Puedes seguir viendo el menú mientras lo preparan.', iconoImg: 'ICONO-PEDIDO.png', tituloCentral: 'Pedido aceptado', claseIcono: 'ok' },
  { paso: 2, texto: 'Se está preparando', subtitulo: 'Tu pedido se está preparando. Te avisaremos aquí abajo en cuanto esté listo.', iconoImg: 'ICONO-COCINANDO.png', tituloCentral: 'Tiempo de espera', claseIcono: 'espera' },
  { paso: 3, texto: 'Tu pedido está listo', subtitulo: '¡Tu pedido está listo! Ya viene en camino a tu mesa.', iconoImg: 'ICONO-PLATO_LISTO.png', tituloCentral: 'Tu pedido está listo', claseIcono: 'ok' },
  { paso: 4, texto: 'Pedido entregado', subtitulo: 'Tu pedido fue entregado. ¡Buen provecho!', iconoImg: 'ICONO-PLATO_LISTO.png', tituloCentral: '¡Pedido entregado!', claseIcono: 'ok' },
];

  function mapaEstadoAPaso(estadoOrdenId) {
    if (estadoOrdenId <= 1) return 1;
    if (estadoOrdenId === 2) return 2;
    if (estadoOrdenId === 3) return 3; // Listo para Servir
    return 4; // Entregado (o Cancelado, tratado igual para no bloquear al cliente)
  }

 
 function aplicarPaso(paso) {
  const info = PASOS[paso - 1];
  if (!info) return;

  estado.pasoActual = paso;

  elBarraProgreso.dataset.paso = String(paso);
  elBarraProgreso.classList.remove('oculto');
  elProgresoRelleno.style.width = `${(paso / PASOS.length) * 100}%`;
  elProgresoTexto.innerHTML = `<img src="/static/img/${info.iconoImg}" alt="" class="icono-paso">${info.texto}`;
  if (elProgresoNum) elProgresoNum.textContent = String(paso);

  elEstadoTitulo.textContent = info.tituloCentral;
  elEstadoSubtitulo.textContent = info.subtitulo;
  elEstadoIcono.className = `pantalla-estado__icono pantalla-estado__icono--${info.claseIcono}`;

  if (paso === 2) {
    iniciarCronometro();
  } else {
    detenerCronometro();
    elEstadoIcono.innerHTML = `<img src="/static/img/${info.iconoImg}" alt="" class="icono-estado-grande">`;
  }

  actualizarBotonVolver();

  if (paso === 4) {
    if (estado.sondeoId) { clearInterval(estado.sondeoId); estado.sondeoId = null; }
    estado.pedidoActivo = false;
    estado.ultimaConfirmacion = null;
    sessionStorage.removeItem(claveSeguimiento());
    renderizarBarraCarrito(); // ya se puede volver a pedir
  }
}

// Cambia el texto del boton segun en que paso está el pedido:
// mientras esta activo invita a agregar mas; cuando ya se entrego,
// invita a reiniciar el flujo pidiendo de nuevo.
function actualizarBotonVolver() {
  elVolverMenu.textContent = estado.pasoActual === 4 ? 'Pedir más' : 'Agregar más al pedido';
}
  // Cronometro aproximado de "tiempo de espera" mientras el pedido esta en
  // preparacion. La hora de fin se guarda en sessionStorage para que, si el
  // cliente recarga la pagina, la cuenta regresiva siga desde donde iba en
  // vez de reiniciarse a 20 min.
  function iniciarCronometro() {
    let finTimestamp = Number(sessionStorage.getItem(claveTemporizador()));
    if (!finTimestamp) {
      finTimestamp = Date.now() + MINUTOS_ESTIMADOS_PREPARACION * 60000;
      sessionStorage.setItem(claveTemporizador(), String(finTimestamp));
    }

    function pintar() {
      const minutosRestantes = Math.max(0, Math.ceil((finTimestamp - Date.now()) / 60000));
      elEstadoIcono.innerHTML = minutosRestantes > 0
        ? `<span class="cronometro"><span class="cronometro-num">${minutosRestantes}</span><span class="cronometro-unidad">min</span></span>`
        : `<span class="cronometro"><span class="cronometro-num">⏳</span><span class="cronometro-unidad">en breve</span></span>`;
    }

    pintar();
    if (estado.temporizadorId) clearInterval(estado.temporizadorId);
    estado.temporizadorId = setInterval(pintar, 1000);
  }

  function detenerCronometro() {
    if (estado.temporizadorId) { clearInterval(estado.temporizadorId); estado.temporizadorId = null; }
    sessionStorage.removeItem(claveTemporizador());
  }

  async function iniciarSondeoEstado() {
    if (estado.sondeoId) clearInterval(estado.sondeoId);
    await actualizarSeguimiento();
    estado.sondeoId = setInterval(actualizarSeguimiento, 8000);
  }

 async function actualizarSeguimiento() {
  try {
    const ordenes = await FF.api.ordenesPorMesa(numeroMesa);
    if (!ordenes.length) {
      renderizarResumenPedido([]);
      return;
    }

    const activas = ordenes.filter(o => Number(o.estado_orden_id) < 4);
    if (!activas.length) {
      aplicarPaso(4);
      renderizarResumenPedido([]);
      return;
    }

    const paso = mapaEstadoAPaso(Math.max(...activas.map(o => Number(o.estado_orden_id) || 1)));
    aplicarPaso(paso);

    const idsRelevantes = activas.map(o => o.orden_id).filter(id => id !== undefined && id !== null);
    try {
      const detalle = await FF.api.listarDetalleOrdenes();
      renderizarResumenPedido(detalle.filter(l => idsRelevantes.includes(l.orden_id)));
    } catch (_) { /* si falla, simplemente no se muestra el resumen */ }
  } catch (error) {
    console.error('No se pudo actualizar el seguimiento del pedido', error);
  }
}

  function volverAlMenu() {
    elVistaEstado.classList.add('oculto');
    elVistaMenu.classList.remove('oculto');
    renderizarBarraCarrito(); // por si el pedido ya se entregó y hay que volver a mostrar el carrito
  }

  function verEstadoPedido() {
    elVistaMenu.classList.add('oculto');
    elVistaEstado.classList.remove('oculto');
  }

  function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = String(texto ?? '');
    return div.innerHTML;
  }

  function abrirAyuda(disparador) {
    disparadorModal = disparador || null;
    elModalAyuda.dataset.abierta = 'true';
    elModalAyuda.querySelector('.hoja-modal__panel').focus();
    liberarFocoModal = FF.atraparFoco(elModalAyuda, cerrarAyuda);
  }
  function cerrarAyuda() {
    elModalAyuda.dataset.abierta = 'false';
    if (liberarFocoModal) liberarFocoModal();
    (disparadorModal || elBotonAyuda).focus();
  }

  function configurarEventos() {
    elBotonCarrito.addEventListener('click', (e) => abrirCarrito(e.currentTarget));
    elCerrarCarrito.addEventListener('click', cerrarCarrito);
    elModalCarrito.querySelector('.hoja-modal__fondo').addEventListener('click', cerrarCarrito);
    elFormPago.addEventListener('change', (e) => { if (e.target.name === 'metodo-pago') estado.metodoPago = e.target.value; });
    elBotonConfirmar.addEventListener('click', confirmarPedido);
    elVolverMenu.addEventListener('click', volverAlMenu);

    elBotonAyuda.addEventListener('click', (e) => abrirAyuda(e.currentTarget));
    elCerrarAyuda.addEventListener('click', cerrarAyuda);
    elEntendidoAyuda.addEventListener('click', cerrarAyuda);
    elModalAyuda.querySelector('.hoja-modal__fondo').addEventListener('click', cerrarAyuda);

    // Tocar la barra de progreso (fuera del botón "?") vuelve a mostrar
    // la pantalla grande de estado del pedido, aunque el cliente haya
    // regresado al menú.
    elBarraProgreso.addEventListener('click', (e) => {
      if (e.target.closest('#boton-ayuda')) return;
      verEstadoPedido();
    });
  }

  iniciar();
})();
