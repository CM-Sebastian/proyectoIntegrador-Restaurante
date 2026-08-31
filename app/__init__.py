from flask import Flask
import os
from database.models import init_db
from config import appConfig
from .main_routes import mainRoutes


def create_app():
    # app/__init__.py vive dentro de app/, así que subimos un nivel para
    # llegar a la raíz del proyecto donde están templates/ y static/.
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_templates = os.path.join(base_dir, 'templates')
    ruta_static = os.path.join(base_dir, 'static')

    app = Flask(__name__, template_folder=ruta_templates, static_folder=ruta_static)
    app.config.from_object(appConfig)

    # Inicializar base de datos
    init_db(app)

    # Registrar Blueprint
    app.register_blueprint(mainRoutes)

    return app
