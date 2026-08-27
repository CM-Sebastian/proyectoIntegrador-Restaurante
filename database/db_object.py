from db_object import db

producto = None
categoria = None
orden = None
detalle_orden = None


def cargar_tablas():

    global producto
    global categoria
    global orden
    global detalle_orden

    db.metadata.reflect()


    categoria = db.metadata.tables["categorias"]