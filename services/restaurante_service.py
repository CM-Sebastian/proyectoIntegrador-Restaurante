from flask import jsonify
from ..database.models import db,tablas
from sqlalchemy import select, update, delete

#Funciones o clases para usar queries

def selectTabla(nombre_tabla):
    stmt = select(tablas[nombre_tabla]) 
    selectDatos = db.session.execute(stmt).mappings().all()
    data = [dict(fila) for fila in selectDatos]
    return data


def verMenu():
    stmt = select(tablas["platillos"]) 
    selectDatos = db.session.execute(stmt).mappings().all()
    data = [fila["platillos"] for fila in selectDatos]
    resultado = []
    for p in data:
        d = p.__dict__.copy()
        d.pop('_sa_instance_state', None)
        resultado.append(d)
    return resultado
