from flask import Flask
from .config import appConfig
from .database.db_object import db
from .routes.main_routes import mainRoutes

app = Flask(__name__)
app.config.from_object(appConfig)

# Configuración de base de datos
app.config["SQLALCHEMY_DATABASE_URI"] = appConfig.SQLALCHEMY_DATABASE_URI

db.init_app(app)

app.register_blueprint(mainRoutes)



if __name__ == "__main__":
    app.run(debug=True)