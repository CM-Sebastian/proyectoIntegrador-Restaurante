from abc import ABC,abstractmethod
from sqlalchemy import inspect, select, insert, update, delete, text
from ..database.models import db, tablas


class baseServices(ABC):
    @abstractmethod
    def selectTabla(self, nombre_tabla):
        pass

    @abstractmethod
    def insertTabla(self, nombre_tabla, **kwargs):
            pass

    @abstractmethod
    def updateTabla(self, nombre_tabla, where=None, **kwargs):
            pass

    @abstractmethod
    def deleteTabla(self, nombre_tabla, **where):
            pass


class restauranteServices(baseServices):

    # Utileria
    @staticmethod
    def to_dict(data, nombre_tabla):
        """
        Soporta tanto un objeto individual como una lista de objetos.
        Convierte filas SQLAlchemy en diccionarios serializables.
        """
        if not data:
            return []

        if isinstance(data, list):
            dataProcesada = [fila[nombre_tabla] for fila in data]
            return [{c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs} for obj in dataProcesada]

        return {c.key: getattr(data, c.key) for c in inspect(data).mapper.column_attrs}


    # Funciones o clases para usar queries

    @staticmethod
    def selectTabla(nombre_tabla):
        """Devuelve todos los registros de una tabla."""
        if nombre_tabla not in tablas:
            return []

        stmt = select(tablas[nombre_tabla])
        resultado = db.session.execute(stmt).mappings().all()
        return restauranteServices.to_dict(resultado, nombre_tabla)


    # Aqui debe ser abstraccion para mostrar lo que se puede hacer a simple vista

    @staticmethod
    def insertTabla(nombre_tabla, **kwargs):
        """Inserta un registro en una tabla."""
        if nombre_tabla not in tablas:
            return None

        stmt = insert(tablas[nombre_tabla]).values(**kwargs)
        resultado = db.session.execute(stmt)
        db.session.commit()
        return resultado


    @staticmethod
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
            raise ValueError("Se requiere al menos una condición WHERE para actualizar.")

        stmt = update(tabla).where(*filtros).values(**kwargs)
        resultado = db.session.execute(stmt)
        db.session.commit()
        return resultado.rowcount


    @staticmethod
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
            raise ValueError("Se requiere al menos una condición WHERE para eliminar.")

        stmt = delete(tabla).where(*filtros)
        resultado = db.session.execute(stmt)
        db.session.commit()
        return resultado.rowcount


    # Registrar nueva orden usando el procedimiento almacenado.
    # Uso: registrar_nueva_orden(numero_mesa, platillo_id, cantidad, metodo_pago_id)
    def registrar_nueva_orden(numero_mesa, platillo_id, cantidad, metodo_pago_id):
        """Ejecuta CALL public.sp_registrarnuevaorden(...)."""
        if int(cantidad) <= 0:
            raise ValueError("La cantidad debe ser mayor que 0.")

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


    # Obtener todas las órdenes registradas.
    # Uso: obtener_ordenes()
    def obtener_ordenes():
        if "pedidos" in tablas:
            return restauranteServices.selectTabla("pedidos")
        if "ordenes" in tablas:
            return restauranteServices.selectTabla("ordenes")
        return []


    # Obtener una orden por identificador.
    # Uso: obtener_orden_por_id(orden_id)
    def obtener_orden_por_id(orden_id):
        for nombre in ("pedidos", "ordenes"):
            if nombre in tablas:
                registros = restauranteServices.selectTabla(nombre)
                for registro in registros:
                    if registro.get("id") == orden_id:
                        return registro
        return None


    # Obtener órdenes de una mesa en específico.
    # Uso: obtener_ordenes_por_mesa(mesa_id)
    def obtener_ordenes_por_mesa(mesa_id):
        for nombre in ("pedidos", "ordenes"):
            if nombre in tablas:
                registros = restauranteServices.selectTabla(nombre)
                filtrados = []
                for registro in registros:
                    if registro.get("mesa_id") == mesa_id or registro.get("numero_mesa") == mesa_id:
                        filtrados.append(registro)
                return filtrados
        return []


