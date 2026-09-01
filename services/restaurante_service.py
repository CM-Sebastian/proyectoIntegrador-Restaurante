from sqlalchemy import inspect, select, insert, update, delete, text
from ..database.models import db, tablas
from datetime import datetime, date
from decimal import Decimal


# Utileria

def _valor_serializable(valor):
    """
    Convierte tipos que Flask/JS interpretan mal:
    - datetime: a ISO 8601 SIN sufijo de zona.
      La columna es 'timestamp without time zone' y guarda la hora LOCAL
      de Ecuador. Si se deja que Flask la serialice con su formato por
      defecto, la etiqueta como GMT y el navegador la interpreta como UTC,
      desfasando los calculos de tiempo por 5 horas.
      Un string ISO con 'T' y SIN 'Z'/offset es interpretado por
      new Date(...) en JS como hora LOCAL del navegador.
    - Decimal: a float, para que json.dumps no truene.
    """
    if isinstance(valor, datetime):
        return valor.isoformat()
    if isinstance(valor, date):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return float(valor)
    return valor


def to_dict(data, nombre_tabla):
    """
    Soporta tanto un objeto individual como una lista de objetos.
    Convierte filas SQLAlchemy en diccionarios serializables.
    """
    if not data:
        return []

    if isinstance(data, list):
        dataProcesada = [fila[nombre_tabla] for fila in data]
        return [
            {c.key: _valor_serializable(getattr(obj, c.key)) for c in inspect(obj).mapper.column_attrs}
            for obj in dataProcesada
        ]

    return {c.key: _valor_serializable(getattr(data, c.key)) for c in inspect(data).mapper.column_attrs}


# Funciones o clases para usar queries

def selectTabla(nombre_tabla):
    """Devuelve todos los registros de una tabla."""
    if nombre_tabla not in tablas:
        return []

    stmt = select(tablas[nombre_tabla])
    resultado = db.session.execute(stmt).mappings().all()
    return to_dict(resultado, nombre_tabla)


# Aqui debe ser abstraccion para mostrar lo que se puede hacer a simple vista

def insertTabla(nombre_tabla, **kwargs):
    """Inserta un registro en una tabla."""
    if nombre_tabla not in tablas:
        return None

    stmt = insert(tablas[nombre_tabla]).values(**kwargs)
    resultado = db.session.execute(stmt)
    db.session.commit()
    return resultado


def updateTabla(nombre_tabla, where=None, **kwargs):
    """Actualiza registros en una tabla usando condiciones WHERE reutilizables."""
    if nombre_tabla not in tablas:
        return 0

    tabla = tablas[nombre_tabla]
    filtros = []

    if where is None:
        where = {}

    for campo, valor in where.items():
        if not hasattr(tabla, campo):
            raise AttributeError(f"La columna '{campo}' no existe en la tabla '{nombre_tabla}'.")
        filtros.append(getattr(tabla, campo) == valor)

    if not filtros:
        raise ValueError("Se requiere al menos una condicion WHERE para actualizar.")

    stmt = update(tabla).where(*filtros).values(**kwargs)
    resultado = db.session.execute(stmt)
    db.session.commit()
    return resultado.rowcount


def deleteTabla(nombre_tabla, **where):
    """Elimina registros en una tabla usando condiciones WHERE reutilizables."""
    if nombre_tabla not in tablas:
        return 0

    tabla = tablas[nombre_tabla]
    filtros = []

    for campo, valor in where.items():
        if not hasattr(tabla, campo):
            raise AttributeError(f"La columna '{campo}' no existe en la tabla '{nombre_tabla}'.")
        filtros.append(getattr(tabla, campo) == valor)

    if not filtros:
        raise ValueError("Se requiere al menos una condicion WHERE para eliminar.")

    stmt = delete(tabla).where(*filtros)
    resultado = db.session.execute(stmt)
    db.session.commit()
    return resultado.rowcount


# Registrar nueva orden usando el procedimiento almacenado.
# Uso: registrar_nueva_orden(numero_mesa, platillo_id, cantidad, metodo_pago_id)
def _resolver_mesa_id(numero_mesa):
    """Traduce el numero de mesa visible (Mesas.numero_mesa) a la PK interna (Mesas.mesa_id)."""
    if "mesas" not in tablas:
        return None
    for m in selectTabla("mesas"):
        if m.get("numero_mesa") == numero_mesa:
            return m.get("mesa_id")
    return None


def _orden_pendiente_reciente(numero_mesa):
    """
    Busca una orden en estado 'Pendiente' (estado_orden_id = 1) de esta mesa,
    creada hace menos de 2 minutos. Se usa para agrupar todas las lineas de
    un mismo carrito en UNA sola orden, en vez de una orden por platillo.
    """
    from datetime import datetime, timedelta

    if "ordenes" not in tablas:
        return None

    mesa_id = _resolver_mesa_id(numero_mesa)
    if mesa_id is None:
        return None

    registros = selectTabla("ordenes")
    limite = datetime.utcnow() - timedelta(minutes=2)
    candidatas = [
        r for r in registros
        if r.get("mesa_id") == mesa_id
        and r.get("estado_orden_id") == 1
        and r.get("fecha_hora")
        and r["fecha_hora"] >= limite
    ]
    if not candidatas:
        return None
    candidatas.sort(key=lambda r: r["fecha_hora"], reverse=True)
    return candidatas[0]


def registrar_nueva_orden(numero_mesa, platillo_id, cantidad, metodo_pago_id, forzar_nueva_orden=False):
    """
    Registra un platillo del carrito. Si ya existe una orden Pendiente
    reciente para la misma mesa, inserta el platillo como una nueva linea
    de Detalle_Orden en ESA orden en lugar de crear una orden nueva.
    """
    if int(cantidad) <= 0:
        raise ValueError("La cantidad debe ser mayor que 0.")

    orden_existente = None if forzar_nueva_orden else _orden_pendiente_reciente(int(numero_mesa))

    if orden_existente is not None and "detalle_orden" in tablas:
        platillo = None
        if "platillos" in tablas:
            for p in selectTabla("platillos"):
                if p.get("platillo_id") == int(platillo_id):
                    platillo = p
                    break
        precio_unitario = float(platillo["precio"]) if platillo else 0.0
        subtotal = round(precio_unitario * int(cantidad), 2)

        insertTabla(
            "detalle_orden",
            orden_id=orden_existente["orden_id"],
            platillo_id=int(platillo_id),
            cantidad=int(cantidad),
            precio_unitario=precio_unitario,
            subtotal=subtotal,
        )
        nuevo_total = float(orden_existente.get("total") or 0) + subtotal
        updateTabla("ordenes", {"orden_id": orden_existente["orden_id"]}, total=nuevo_total)
        return {"mensaje": "Platillo agregado a la orden existente", "orden_id": orden_existente["orden_id"]}

    stmt = text(
        """
        CALL public.sp_registrarnuevaorden(
            :p_numero_mesa,
            :p_platillo_id,
            :p_cantidad,
            :p_metodo_pago_id
        )
        """
    )

    db.session.execute(
        stmt,
        {
            "p_numero_mesa": int(numero_mesa),
            "p_platillo_id": int(platillo_id),
            "p_cantidad": int(cantidad),
            "p_metodo_pago_id": int(metodo_pago_id),
        },
    )
    db.session.commit()
    return {"mensaje": "Orden registrada correctamente"}


# Obtener todas las ordenes registradas.
def obtener_ordenes():
    if "pedidos" in tablas:
        return selectTabla("pedidos")
    if "ordenes" in tablas:
        return selectTabla("ordenes")
    return []


# Obtener una orden por identificador.
def obtener_orden_por_id(orden_id):
    for nombre in ("pedidos", "ordenes"):
        if nombre in tablas:
            registros = selectTabla(nombre)
            for registro in registros:
                if registro.get("id") == orden_id:
                    return registro
    return None


# Obtener ordenes de una mesa en especifico.
def obtener_ordenes_por_mesa(mesa_id):
    for nombre in ("pedidos", "ordenes"):
        if nombre in tablas:
            registros = selectTabla(nombre)
            filtrados = []
            for registro in registros:
                if registro.get("mesa_id") == mesa_id or registro.get("numero_mesa") == mesa_id:
                    filtrados.append(registro)
            return filtrados
    return []
