from flask import Blueprint, render_template, abort, jsonify
from jinja2 import TemplateNotFound
from ..services.restaurante_service import *

#from ..services.restaurante_service import consulta_Categ

mainRoutes = Blueprint('main_pages', __name__, template_folder='templates')

@mainRoutes.route('/')
def mainPage():
    return render_template("index.html")

@mainRoutes.route('/<route>')
def mainRouteHandler(route):
    try:
        return render_template(f'pages/{route}.html')
    except TemplateNotFound:
        abort(404)


@mainRoutes.errorhandler(404)
def notfoundError(error):
    return render_template('404.html'),404

@mainRoutes.route('/menu/')
def viewMenu():
    return jsonify(verMenu())


@mainRoutes.route('/mesa/<id>',methods=['POST'])
def pedidoMesa():
    pass


@mainRoutes.route('/ordenes',methods=['POST'])
def crearOrden():
    pass

@mainRoutes.route('/admin/ordenes')
def viewAdminOrdenes():
    pass

@mainRoutes.route('/ordenes/<id>',methods=['PUT'])
def actualizarOrden():
    pass

@mainRoutes.route('/login',methods=['POST'])
def login():
    pass


@mainRoutes.route('/test/<string:tabla>')
def test(tabla):
    return selectTabla(tabla)


