from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.automap import automap_base


db = SQLAlchemy()

# 1. Crear la base para automap
Base = automap_base()


tablas = {}

def init_db(app):
    global Usuario, Pedido
    
    db.init_app(app)

# 2. Reflejar esquemas y preparar clases dentro del contexto de Flask
    with app.app_context():
        Base.prepare(autoload_with=db.engine)

        for nombre_tabla, clase_orm in Base.classes.items():
            tablas[nombre_tabla] = clase_orm 
