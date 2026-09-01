/**
 * FentchFood — utilidades compartidas por cliente.js, cocina.js y admin.js
 *
 * IMPORTANTE (léase antes de tocar los otros archivos):
 * El backend actual (app/main_routes.py) NO expone endpoints dedicados para
 * "detalle_orden", "estados_orden", "estados_mesa" ni "metodos_pago", y solo
 * tiene PUT/DELETE para /ordenes (no para /mesas ni /platillos).
 * Mientras esas rutas no existan, usamos el endpoint de depuración
 * GET /test/<tabla> (ya definido en main_routes.py) para leer esas tablas
 * automapeadas tal cual están en PostgreSQL. Todo este acceso está
 * centralizado aquí en `FF.api`, así que el día que agregues los endpoints
 * "reales" solo se cambia en un lugar.
 */
const FF = (() => {
  const BASE = '';

  async function solicitar(ruta, opciones = {}) {
  const esFormData = opciones.body instanceof FormData;
  const respuesta = await fetch(BASE + ruta, {
    ...opciones,
    headers: esFormData ? opciones.headers : { 'Content-Type': 'application/json', ...opciones.headers },
  });
  let cuerpo = null;
  try { cuerpo = await respuesta.json(); } catch (_) { /* sin cuerpo JSON */ }
  if (!respuesta.ok) {
    const error = new Error((cuerpo && (cuerpo.error || cuerpo.detalle)) || `Error ${respuesta.status}`);
    error.status = respuesta.status;
    error.cuerpo = cuerpo;
    throw error;
  }
  return cuerpo;
}

  const api = {
    // --- Endpoints ya existentes en el backend ---
    listarCategorias: () => solicitar('/categorias'),
    listarPlatillos: () => solicitar('/platillos'),
    obtenerPlatillo: (id) => solicitar(`/platillo/${id}`),
    listarMesas: () => solicitar('/mesas'),
    crearMesa: (datos) => solicitar('/mesas', { method: 'POST', body: JSON.stringify(datos) }),
    listarOrdenes: () => solicitar('/ordenes'),
    crearOrden: (datos) => solicitar('/ordenes', { method: 'POST', body: JSON.stringify(datos) }),
    actualizarOrden: (id, datos) => solicitar(`/ordenes/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
    ordenesPorMesa: (mesaId) => solicitar(`/ordenes/mesa/${mesaId}`),
    crearPlatillo: (datos) => solicitar('/platillos', { method: 'POST', body: datos instanceof FormData ? datos : JSON.stringify(datos) }),

    // --- Lecturas auxiliares vía endpoint de depuración /test/<tabla> ---
    tabla: (nombre) => solicitar(`/test/${nombre}`),
    listarDetalleOrdenes: () => solicitar('/test/detalle_orden'),
    listarEstadosOrden: () => solicitar('/test/estados_orden'),
    listarEstadosMesa: () => solicitar('/test/estados_mesa'),
    listarMetodosPago: () => solicitar('/test/metodos_pago'),

    // --- Endpoints que TODAVÍA NO existen en el backend (ver aviso arriba).
    //     Se llaman de forma optimista y el llamador debe capturar el error
    //     404/405 para avisar al usuario que falta implementarlos. ---
    actualizarMesa: (id, datos) => solicitar(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
    actualizarPlatillo: (id, datos) => solicitar(`/platillos/${id}`, { method: 'PUT', body: datos instanceof FormData ? datos : JSON.stringify(datos) }),
    eliminarPlatillo: (id) => solicitar(`/platillos/${id}`, { method: 'DELETE' }),
  };

  function formatoMoneda(valor) {
    const numero = Number(valor) || 0;
    return '$' + numero.toFixed(2);
  }

  function tiempoTranscurrido(fechaISO) {
    const inicio = new Date(fechaISO).getTime();
    if (Number.isNaN(inicio)) return { minutos: 0, texto: '—' };
    const minutos = Math.max(0, Math.round((Date.now() - inicio) / 60000));
    return { minutos, texto: `${minutos} min` };
  }

  /** Región de toasts accesible (aria-live) compartida por las 3 vistas. */
  function crearRegionToast() {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    return region;
  }

  function notificar(mensaje) {
    const region = crearRegionToast();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  /** Atrapa el foco dentro de un contenedor mientras un modal está abierto. */
  function atraparFoco(contenedor, alCerrar) {
    const seleccionables = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    function manejarTecla(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        alCerrar();
        return;
      }
      if (evento.key !== 'Tab') return;
      const focosVisibles = Array.from(contenedor.querySelectorAll(seleccionables)).filter(el => el.offsetParent !== null);
      if (focosVisibles.length === 0) return;
      const primero = focosVisibles[0];
      const ultimo = focosVisibles[focosVisibles.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault(); ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault(); primero.focus();
      }
    }
    contenedor.addEventListener('keydown', manejarTecla);
    return () => contenedor.removeEventListener('keydown', manejarTecla);
  }

  // Catálogo conocido de Estados_Orden según la carga inicial en
  // database/base de datos.txt (INSERT INTO Estados_Orden ...).
  // Se usa como respaldo si /test/estados_orden no responde.
  const ESTADOS_ORDEN_RESPALDO = [
    { estado_orden_id: 1, nombre: 'Pendiente' },
    { estado_orden_id: 2, nombre: 'En Preparación' },
    { estado_orden_id: 3, nombre: 'Listo para Servir' },
    { estado_orden_id: 4, nombre: 'Entregado' },
    { estado_orden_id: 5, nombre: 'Cancelado' },
  ];

  const ESTADOS_MESA_RESPALDO = [
    { estado_mesa_id: 1, nombre: 'Disponible' },
    { estado_mesa_id: 2, nombre: 'Ocupada' },
    { estado_mesa_id: 3, nombre: 'Reservada' },
  ];

  return { api, formatoMoneda, tiempoTranscurrido, notificar, atraparFoco, ESTADOS_ORDEN_RESPALDO, ESTADOS_MESA_RESPALDO };
})();
