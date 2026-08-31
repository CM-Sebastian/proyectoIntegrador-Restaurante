from flask import Flask
import os
from ..database.models import restauranteModels
from ..config import appConfig
from .main_routes import mainRoutes



def create_app():
    ruta_templates = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates'))
    app = Flask(__name__,template_folder=ruta_templates)
    
    # Cargar configuración (p. ej. SQLALCHEMY_DATABASE_URI)
    app.config.from_object(appConfig)
    
    # Inicializar la base de datos y auto-mapear dentro del contexto
    restauranteModels.init_db(app)
    
    # Registrar Blueprints o Rutas
    app.register_blueprint(mainRoutes)

    return app