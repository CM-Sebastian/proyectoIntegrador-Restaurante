/**
 * FentchFood — interfaz Administración
 * Tres vistas dentro de una sola página (Mapa de mesas / Menu-Inventario / Reportes),
 * enrutadas por hash (#mesas, #menu, #reportes) para que se puedan compartir enlaces
 * directos y funcione el botón "atras" del navegador.
 * Depende de FF (main.js).
 */
(() => {
  const estado = {
    vista: 'mesas',
    mesas: [], platillos: [], categorias: [], ordenes: [], detalle: [], estadosMesa: FF.ESTADOS_MESA_RESPALDO,
  };

  const vistas = {
    mesas: document.getElementById('vista-mesas'),
    menu: document.getElementById('vista-menu-admin'),
    reportes: document.getElementById('vista-reportes'),
  };
  const enlacesNav = document.querySelectorAll('.admin-nav a[data-vista]');
  const elTituloVista = document.getElementById('titulo-vista-admin');

  const elGrillaMesas = document.getElementById('grilla-mesas');
  const elBotonNuevaMesa = document.getElementById('boton-nueva-mesa');
  const elTablaMenu = document.getElementById('cuerpo-tabla-menu');
  const elFormNuevoPlatillo = document.getElementById('form-nuevo-platillo');
  const elSelectCategoriaNuevo = document.getElementById('nuevo-platillo-categoria');
  const elGrafica = document.getElementById('grafica-platos');
  const elActividad = document.getElementById('cuerpo-actividad-reciente');

  const elModal = document.getElementById('modal-admin');
  const elModalTitulo = document.getElementById('modal-admin-titulo');
  const elModalCuerpo = document.getElementById('modal-admin-cuerpo');
  const elModalCerrar = document.getElementById('modal-admin-cerrar');
  let liberarFocoModal = null;
  let disparadorModal = null;

  function idMesa(m) { return m.mesa_id ?? m.id; }
  function idPlatillo(p) { return p.platillo_id ?? p.id; }
  function idCategoria(c) { return c.categoria_id ?? c.id; }

  // --- Enrutado por hash entre las 3 vistas ---
  function irAVista(nombre) {
    estado.vista = nombre;
    Object.entries(vistas).forEach(([clave, el]) => el.classList.toggle('oculto', clave !== nombre));
    enlacesNav.forEach(a => {
      const activo = a.dataset.vista === nombre;
      if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const titulos = { mesas: 'Mapa de mesas', menu: 'Gestión del menú', reportes: 'Reportes' };
    elTituloVista.textContent = titulos[nombre] || 'Administración';
    document.title = `FentchFood — ${titulos[nombre]}`;
    if (nombre === 'reportes') cargarReportes();
  }

  enlacesNav.forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = a.dataset.vista;
  }));
  window.addEventListener('hashchange', () => irAVista((location.hash || '#mesas').slice(1)));

  // --- Carga inicial ---
  async function iniciar() {
    try { estado.estadosMesa = await FF.api.listarEstadosMesa(); } catch (_) { /* respaldo */ }
    elBotonNuevaMesa.addEventListener('click', () => abrirFormularioNuevaMesa(elBotonNuevaMesa));
    await Promise.all([cargarMesas(), cargarMenu()]);
    irAVista((location.hash || '#mesas').slice(1));
    configurarFormularioPlatillo();
    elModalCerrar.addEventListener('click', cerrarModal);
    elModal.querySelector('.hoja-modal__fondo').addEventListener('click', cerrarModal);
  }

  function abrirFormularioNuevaMesa(disparador) {
    const opciones = estado.estadosMesa.map(e => {
      const id = e.estado_mesa_id ?? e.id;
      return `<option value="${id}">${e.nombre}</option>`;
    }).join('');

    abrirModal('Crear nueva mesa', `
      <form id="form-nueva-mesa">
        <div class="campo">
          <label for="nueva-mesa-numero">Número de mesa</label>
          <input type="number" id="nueva-mesa-numero" min="1" step="1" required>
        </div>
        <div class="campo">
          <label for="nueva-mesa-capacidad">Capacidad</label>
          <input type="number" id="nueva-mesa-capacidad" min="1" step="1" value="2" required>
        </div>
        <div class="campo">
          <label for="nueva-mesa-estado">Estado inicial</label>
          <select id="nueva-mesa-estado" name="estado_mesa_id">${opciones}</select>
        </div>
        <button type="submit" class="btn btn-primario btn-block">Guardar mesa</button>
      </form>
    `, disparador);

    document.getElementById('form-nueva-mesa').addEventListener('submit', async (e) => {
      e.preventDefault();
      const numeroMesa = Number(document.getElementById('nueva-mesa-numero').value);
      const capacidad = Number(document.getElementById('nueva-mesa-capacidad').value);
      const estadoMesaId = Number(document.getElementById('nueva-mesa-estado').value);

      if (!numeroMesa || !capacidad) {
        FF.notificar('Completa número y capacidad de la mesa.');
        return;
      }

      try {
        await FF.api.crearMesa({
          numero_mesa: numeroMesa,
          capacidad,
          estado_mesa_id: estadoMesaId,
        });
        FF.notificar(`Mesa #${numeroMesa} creada correctamente.`);
        cerrarModal();
        await cargarMesas();
      } catch (error) {
        FF.notificar(error.message || 'No se pudo crear la mesa.');
      }
    });
  }

  //  -------MAPA DE MESAS -------
  async function cargarMesas() {
    try { estado.mesas = await FF.api.listarMesas(); renderizarMesas(); }
    catch (error) { elGrillaMesas.innerHTML = '<p role="alert">No se pudieron cargar las mesas.</p>'; }
  }

  function nombreEstadoMesa(idEstado) {
    const encontrado = estado.estadosMesa.find(e => (e.estado_mesa_id ?? e.id) === Number(idEstado));
    return encontrado ? encontrado.nombre : 'Disponible';
  }
  function claseEstadoMesa(nombre) {
    const n = (nombre || '').toLowerCase();
    if (n.includes('ocup')) return 'ocupada';
    if (n.includes('reserv')) return 'reservada';
    return 'libre';
  }

  function renderizarMesas() {
    if (!estado.mesas.length) { elGrillaMesas.innerHTML = '<p>Todavía no hay mesas registradas.</p>'; return; }
    elGrillaMesas.innerHTML = '';
    estado.mesas.forEach(mesa => {
      const nombreEstado = nombreEstadoMesa(mesa.estado_mesa_id);
      const clase = claseEstadoMesa(nombreEstado);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `boton-mesa boton-mesa--${clase}`;
      btn.innerHTML = `Mesa #${mesa.numero_mesa}<span class="caption">${nombreEstado}</span>`;
      btn.setAttribute('aria-label', `Mesa ${mesa.numero_mesa}, estado ${nombreEstado}, capacidad ${mesa.capacidad}. Abrir detalle.`);
      btn.addEventListener('click', (e) => abrirDetalleMesa(mesa, e.currentTarget));
      elGrillaMesas.appendChild(btn);
    });
  }

  function abrirDetalleMesa(mesa, disparador) {
    const opciones = estado.estadosMesa.map(e => {
      const id = e.estado_mesa_id ?? e.id;
      return `<option value="${id}" ${id === mesa.estado_mesa_id ? 'selected' : ''}>${e.nombre}</option>`;
    }).join('');
    abrirModal(`Mesa #${mesa.numero_mesa}`, `
      <p><strong>Capacidad:</strong> ${mesa.capacidad} personas</p>
      <form id="form-editar-mesa">
        <div class="campo">
          <label for="mesa-estado">Estado de la mesa</label>
          <select id="mesa-estado" name="estado_mesa_id">${opciones}</select>
        </div>
        <button type="submit" class="btn btn-primario btn-block">Guardar cambios</button>
      </form>

      <hr class="separador-modal">

      <div class="bloque-qr">
        <h3>Código QR de la mesa</h3>
        <p class="texto-ayuda">Los clientes lo escanean y entran directo al menú de esta mesa.</p>
        <div id="contenedor-qr-mesa" class="contenedor-qr"></div>
        <button type="button" class="btn btn-secundario btn-block" id="boton-descargar-qr">Descargar QR (PNG)</button>
      </div>
    `, disparador);

    document.getElementById('form-editar-mesa').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevoEstado = Number(document.getElementById('mesa-estado').value);
      try {
        await FF.api.actualizarMesa(idMesa(mesa), { estado_mesa_id: nuevoEstado });
        FF.notificar(`Mesa #${mesa.numero_mesa} actualizada.`);
        cerrarModal();
        await cargarMesas();
      } catch (error) {
        FF.notificar(error.message || 'No se pudo actualizar la mesa.');
      }
    });

    generarQrMesa(mesa);
  }

  // Genera el QR de una mesa apuntando a /cliente?mesa=<numero_mesa>
  // y deja listo el botón de descarga como imagen PNG.
  function generarQrMesa(mesa) {
    const contenedor = document.getElementById('contenedor-qr-mesa');
    const botonDescargar = document.getElementById('boton-descargar-qr');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    const enlaceMesa = `${window.location.origin}/cliente?mesa=${mesa.numero_mesa}`;

    // eslint-disable-next-line no-undef
    new QRCode(contenedor, {
      text: enlaceMesa,
      width: 180,
      height: 180,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });

    botonDescargar.addEventListener('click', () => {
      // qrcode.js dibuja un <canvas> (o un <img> como respaldo) dentro del contenedor.
      const canvas = contenedor.querySelector('canvas');
      const dataUrl = canvas
        ? canvas.toDataURL('image/png')
        : contenedor.querySelector('img')?.src;
      if (!dataUrl) return;

      const enlaceDescarga = document.createElement('a');
      enlaceDescarga.href = dataUrl;
      enlaceDescarga.download = `qr-mesa-${mesa.numero_mesa}.png`;
      enlaceDescarga.click();
    });
  }

  // --------- MENU / INVENTARIO ------------
  async function cargarMenu() {
    try {
      const [platillos, categorias] = await Promise.all([FF.api.listarPlatillos(), FF.api.listarCategorias()]);
      estado.platillos = platillos;
      estado.categorias = categorias;
      renderizarTablaMenu();
      renderizarSelectCategorias();
    } catch (error) {
      elTablaMenu.innerHTML = `<tr><td colspan="5" role="alert">No se pudo cargar el menú.</td></tr>`;
    }
  }

  function nombreCategoria(catId) {
    const cat = estado.categorias.find(c => idCategoria(c) === catId);
    return cat ? cat.nombre : '—';
  }

  function renderizarSelectCategorias() {
    elSelectCategoriaNuevo.innerHTML = estado.categorias
      .map(c => `<option value="${idCategoria(c)}">${c.nombre}</option>`).join('');
  }

  function celdaStock(platillo) {
    const stock = Number(platillo.stock_disponible);
    if (stock === 0 || platillo.activo === false) return `<span class="stock-agotado">Agotado</span>`;
    if (stock <= 5) return `<span class="stock-critico">${stock} · Crítico</span>`;
    return `<span class="stock-ok">${stock}</span>`;
  }

  function renderizarTablaMenu() {
    if (!estado.platillos.length) {
      elTablaMenu.innerHTML = `<tr><td colspan="5">Todavía no hay platillos registrados.</td></tr>`;
      return;
    }
    elTablaMenu.innerHTML = '';
    estado.platillos.forEach(platillo => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(platillo.nombre)}</td>
        <td>${escapeHtml(nombreCategoria(platillo.categoria_id))}</td>
        <td class="num">${FF.formatoMoneda(platillo.precio)}</td>
        <td class="num">${celdaStock(platillo)}</td>
        <td></td>
      `;
      const celdaAcciones = tr.lastElementChild;
      const btnEditar = document.createElement('button');
      btnEditar.type = 'button';
      btnEditar.className = 'btn btn-secundario btn-sm';
      btnEditar.innerHTML = '<img src="/static/img/ICONO-EDITAR.png" alt="" class="icono-fila-boton">Editar stock';
      btnEditar.setAttribute('aria-label', `Editar stock de ${platillo.nombre}`);
      btnEditar.addEventListener('click', (e) => abrirEdicionPlatillo(platillo, e.currentTarget));
      celdaAcciones.appendChild(btnEditar);
      elTablaMenu.appendChild(tr);
    });
  }

  function abrirEdicionPlatillo(platillo, disparador) {
  abrirModal(`Editar ${platillo.nombre}`, `
    <form id="form-editar-platillo">
      <div class="campo">
        <label for="platillo-precio">Precio (USD)</label>
        <input type="number" id="platillo-precio" min="0.01" step="0.01" value="${platillo.precio}" required>
      </div>
      <div class="campo">
        <label for="platillo-stock">Stock disponible</label>
        <input type="number" id="platillo-stock" min="0" step="1" value="${platillo.stock_disponible}" required>
      </div>
      <div class="campo">
        <label for="platillo-imagen">Imagen del platillo ${platillo.imagen_url ? '(ya tiene una — sube otra para reemplazarla)' : ''}</label>
        <input type="file" id="platillo-imagen" accept="image/png, image/jpeg, image/webp">
      </div>
      <button type="submit" class="btn btn-primario btn-block">Guardar cambios</button>
    </form>
  `, disparador);

  document.getElementById('form-editar-platillo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = new FormData();
    datos.append('precio', document.getElementById('platillo-precio').value);
    const stock = Number(document.getElementById('platillo-stock').value);
    datos.append('stock_disponible', stock);
    datos.append('activo', stock > 0 ? 'true' : 'false');
    const archivo = document.getElementById('platillo-imagen').files[0];
    if (archivo) datos.append('imagen', archivo);

    try {
      await FF.api.actualizarPlatillo(idPlatillo(platillo), datos);
      FF.notificar(`${platillo.nombre} actualizado.`);
      cerrarModal();
      await cargarMenu();
    } catch (error) {
      FF.notificar(error.message || 'No se pudo actualizar el platillo.');
    }
  });
}
  function configurarFormularioPlatillo() {
  const elImagen = document.getElementById('nuevo-platillo-imagen');
  elFormNuevoPlatillo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nuevo-platillo-nombre').value.trim();
    const categoriaId = elSelectCategoriaNuevo.value;
    if (!nombre || !categoriaId) { FF.notificar('Completa nombre y categoría.'); return; }

    const datos = new FormData();
    datos.append('nombre', nombre);
    datos.append('descripcion', document.getElementById('nuevo-platillo-descripcion').value.trim());
    datos.append('precio', document.getElementById('nuevo-platillo-precio').value);
    datos.append('stock_disponible', document.getElementById('nuevo-platillo-stock').value);
    datos.append('categoria_id', categoriaId);
    datos.append('activo', 'true');
    if (elImagen.files[0]) datos.append('imagen', elImagen.files[0]);

    try {
      await FF.api.crearPlatillo(datos);
      FF.notificar(`${nombre} agregado al menú.`);
      e.target.reset();
      await cargarMenu();
    } catch (error) {
      FF.notificar(error.message || 'No se pudo crear el platillo.');
    }
  });
}

  // ---------------- REPORTES -------------
  async function cargarReportes() {
    try {
      const [ordenes, detalle] = await Promise.all([
        FF.api.listarOrdenes(),
        FF.api.listarDetalleOrdenes().catch(() => []),
      ]);
      estado.ordenes = ordenes;
      estado.detalle = detalle;
      renderizarGraficaTopPlatos();
      renderizarActividadReciente();
    } catch (error) {
      elActividad.innerHTML = `<tr><td colspan="4" role="alert">No se pudieron cargar los reportes.</td></tr>`;
    }
  }

  function renderizarGraficaTopPlatos() {
    const conteo = {};
    estado.detalle.forEach(l => { conteo[l.platillo_id] = (conteo[l.platillo_id] || 0) + Number(l.cantidad || 0); });
    const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!top.length) { elGrafica.innerHTML = '<p>Todavía no hay ventas registradas.</p>'; return; }
    const maximo = top[0][1];
    elGrafica.innerHTML = '';
    top.forEach(([platilloId, cantidad]) => {
      const platillo = estado.platillos.find(p => idPlatillo(p) === Number(platilloId));
      const fila = document.createElement('div');
      fila.className = 'grafica-barras__fila';
      fila.innerHTML = `
        <span>${platillo ? escapeHtml(platillo.nombre) : `Platillo #${platilloId}`}</span>
        <span class="grafica-barras__pista"><span class="grafica-barras__relleno" style="width:${(cantidad / maximo) * 100}%"></span></span>
        <strong>${cantidad}</strong>
      `;
      elGrafica.appendChild(fila);
    });
  }

  function renderizarActividadReciente() {
    const recientes = [...estado.ordenes].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)).slice(0, 12);
    if (!recientes.length) { elActividad.innerHTML = `<tr><td colspan="4">Todavía no hay pedidos.</td></tr>`; return; }
    elActividad.innerHTML = '';
    recientes.forEach(o => {
      const mesa = estado.mesas.find(m => idMesa(m) === o.mesa_id);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${o.orden_id ?? o.id}</td>
        <td>Mesa ${mesa ? mesa.numero_mesa : o.mesa_id}</td>
        <td>${new Date(o.fecha_hora).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td class="num">${FF.formatoMoneda(o.total)}</td>
      `;
      elActividad.appendChild(tr);
    });
  }

  // --------------- MODAL GENERICO --------------
  function abrirModal(titulo, htmlCuerpo, disparador) {
    disparadorModal = disparador || null;
    elModalTitulo.textContent = titulo;
    elModalCuerpo.innerHTML = htmlCuerpo;
    elModal.dataset.abierta = 'true';
    elModal.querySelector('.hoja-modal__panel').focus();
    liberarFocoModal = FF.atraparFoco(elModal, cerrarModal);
  }
  function cerrarModal() {
    elModal.dataset.abierta = 'false';
    if (liberarFocoModal) liberarFocoModal();
    (disparadorModal || elModalCerrar).focus();
  }

  function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = String(texto ?? '');
    return div.innerHTML;
  }

  iniciar();
})();
