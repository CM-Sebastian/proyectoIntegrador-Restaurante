from flask import Flask, render_template, jsonify
from config import Config
from models import db, Categoria, Platillo, Orden, Factura, Mesa, Usuario

app = Flask(__name__)
app.config.from_object(Config)

# Configuración de base de datos
app.config["SQLALCHEMY_DATABASE_URI"] = Config.SQLALCHEMY_DATABASE_URI

db.init_app(app)

@app.route("/")
def inicio():
    categorias = Categoria.query.filter_by(activa=True).all()
    platillos_destacados = Platillo.query.filter_by(disponible=True).all()
    return render_template("index.html", categorias=categorias, platillos=platillos_destacados)

@app.route("/platillo/<int:platillo_id>")
def detalle_platillo(platillo_id):
    platillo = Platillo.query.get_or_404(platillo_id)
    return render_template("detalle.html", platillo=platillo)

@app.route("/ordenes")
def listar_ordenes():
    ordenes = Orden.query.order_by(Orden.fecha_creacion.desc()).all()
    return render_template("ordenes.html", ordenes=ordenes)

@app.route("/facturas")
def listar_facturas():
    facturas = Factura.query.order_by(Factura.fecha_emision.desc()).all()
    return render_template("facturas.html", facturas=facturas)

if __name__ == "__main__":
    app.run(debug=True)