from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.automap import automap_base

class Modelos:

    def __init__(self):
        self.db = SQLAlchemy()
        # 1. Crear la base para automap
        self.base = automap_base()
        self.__tablas = {}

    @property
    def tablas(self):
        return self.__tablas

    def __getitem__(self, clave):
        return self.__tablas[clave]

    # Este es el "setter" usando corchetes
    def __setitem__(self, clave, valor):
        # Aquí puedes poner reglas de validación
        if not isinstance(clave, str):
            raise ValueError("La clave debe ser una cadena de texto.")
        self.__tablas[clave] = valor

    def __repr__(self):
        return str(self.__tablas)

    def init_db(self, app):
        # 2. Reflejar esquemas y preparar clases dentro del contexto de Flask
        self.db.init_app(app)
        
        with app.app_context():
            self.base.prepare(autoload_with=self.db.engine)

            for nombre_tabla, clase_orm in self.base.classes.items():
                self.__tablas[nombre_tabla] = clase_orm 


restauranteModels = Modelos()
db = restauranteModels.db
tablas = restauranteModels.tablas
