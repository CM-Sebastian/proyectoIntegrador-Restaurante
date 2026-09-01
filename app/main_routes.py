from flask import Blueprint, render_template, abort, jsonify, request, current_app
from jinja2 import TemplateNotFound 
from database.models import tablas
from services.restaurante_service import restauranteServices
import os
from werkzeug.utils import secure_filename

# from ..services.restaurante_service import consulta_Categ

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


# Vista del menú de platillos.
# Uso: GET /menu
@mainRoutes.route('/menu')
def viewMenu():
    return jsonify(restauranteServices.selectTabla('platillos'))


@mainRoutes.errorhandler(404)
def notfoundError(error):
    return render_template('404.html'), 404


# Vista de categorías del restaurante.
# Uso: GET /categorias
@mainRoutes.route('/categorias', methods=['GET'])
def viewCategorias():
    return jsonify(restauranteServices.selectTabla('categorias'))


# Crear una categoría nueva.
# Uso: POST /categorias
# Body esperado: {"nombre": "Bebidas", "descripcion": "Refrescos y aguas"}
@mainRoutes.route('/categorias', methods=['POST'])
def crearCategoria():
    payload = request.get_json(silent=True) or {}
    if not payload or not payload.get('nombre'):
        return jsonify({"error": "El campo 'nombre' es obligatorio."}), 400

    try:
        restauranteServices.insertTabla('categorias', **payload)
        return jsonify({"mensaje": "Categoría creada correctamente", "data": payload}), 201
    except Exception as exc:
        return jsonify({"error": "No se pudo crear la categoría.", "detalle": str(exc)}), 500


# Vista del menú de platillos.
# Uso: GET /platillos
@mainRoutes.route('/platillos', methods=['GET'])
def viewPlatillos():
    return jsonify(restauranteServices.selectTabla('platillos'))


# Crear un platillo nuevo asociado a una categoría.
# Uso: POST /platillos
# Body esperado: {"nombre": "Hamburguesa", "descripcion": "Carne + queso", "precio": 120.00, "categoria_id": 1, "stock_disponible": 20, "activo": true}
EXTENSIONES_IMAGEN_PERMITIDAS = {'png', 'jpg', 'jpeg', 'webp'}
def _extension_valida(nombre_archivo):
    return '.' in nombre_archivo and nombre_archivo.rsplit('.', 1)[1].lower() in EXTENSIONES_IMAGEN_PERMITIDAS

@mainRoutes.route('/platillos', methods=['POST'])





# Crear un platillo nuevo. Acepta JSON normal o multipart/form-data
# (cuando el admin sube una imagen real desde el formulario).
# Uso: POST /platillos
@mainRoutes.route('/platillos', methods=['POST'])
def crearPlatillo():
    es_formulario = request.content_type and 'multipart/form-data' in request.content_type
    payload = request.form.to_dict() if es_formulario else (request.get_json(silent=True) or {})
    archivo = request.files.get('imagen') if es_formulario else None

    if not payload or not payload.get('nombre'):
        return jsonify({"error": "El campo 'nombre' es obligatorio."}), 400

    if es_formulario:
        if payload.get('precio'):
            payload['precio'] = float(payload['precio'])
        if payload.get('categoria_id'):
            payload['categoria_id'] = int(payload['categoria_id'])
        if payload.get('stock_disponible'):
            payload['stock_disponible'] = int(payload['stock_disponible'])
        payload['activo'] = str(payload.get('activo', 'true')).lower() in ('true', '1', 'on')

    try:
        if archivo and archivo.filename and _extension_valida(archivo.filename):
            carpeta = os.path.join(current_app.static_folder, 'img', 'platillos')
            os.makedirs(carpeta, exist_ok=True)
            nombre_archivo = secure_filename(f"{payload['nombre']}_{archivo.filename}")
            archivo.save(os.path.join(carpeta, nombre_archivo))
            payload['imagen_url'] = f"/static/img/platillos/{nombre_archivo}"

        restauranteServices.insertTabla('platillos', **payload)
        return jsonify({"mensaje": "Platillo creado correctamente", "data": payload}), 201
    except Exception as exc:
        return jsonify({"error": "No se pudo crear el platillo.", "detalle": str(exc)}), 500
# Actualizar un platillo existente (precio, stock, activo, imagen, etc.)
# Uso: PUT /platillos/<id>
@mainRoutes.route('/platillos/<int:id>', methods=['PUT'])
def actualizarPlatillo(id):
    es_formulario = request.content_type and 'multipart/form-data' in request.content_type
    payload = request.form.to_dict() if es_formulario else (request.get_json(silent=True) or {})
    archivo = request.files.get('imagen') if es_formulario else None

    if not payload and not archivo:
        return jsonify({"error": "No se enviaron datos para actualizar."}), 400

    if es_formulario:
        if payload.get('precio'):
            payload['precio'] = float(payload['precio'])
        if payload.get('stock_disponible'):
            payload['stock_disponible'] = int(payload['stock_disponible'])
        if 'activo' in payload:
            payload['activo'] = str(payload['activo']).lower() in ('true', '1', 'on')

    try:
        if archivo and archivo.filename and _extension_valida(archivo.filename):
            carpeta = os.path.join(current_app.static_folder, 'img', 'platillos')
            os.makedirs(carpeta, exist_ok=True)
            nombre_archivo = secure_filename(f"platillo{id}_{archivo.filename}")
            archivo.save(os.path.join(carpeta, nombre_archivo))
            payload['imagen_url'] = f"/static/img/platillos/{nombre_archivo}"

        affected = restauranteServices.updateTabla('platillos', {'platillo_id': id}, **payload)
        if affected == 0:
            return jsonify({"error": "Platillo no encontrado."}), 404
        return jsonify({"mensaje": "Platillo actualizado correctamente"})
    except Exception as exc:
        return jsonify({"error": "No se pudo actualizar el platillo.", "detalle": str(exc)}), 500
# Detalle de un platillo por ID.
# Uso: GET /platillo/<id>
@mainRoutes.route('/platillo/<int:id>')
def viewPlatillo(id):
    platillos = restauranteServices.selectTabla('platillos')
    for platillo in platillos:
        if platillo.get('id') == id:
            return jsonify(platillo)
    return jsonify({"error": "Platillo no encontrado"}), 404


# Vista de mesas disponibles o registradas.
# Uso: GET /mesas
@mainRoutes.route('/mesas', methods=['GET'])
def viewMesas():
    return jsonify(restauranteServices.selectTabla('mesas'))


# Crear una mesa nueva.
# Uso: POST /mesas
# Body esperado: {"numero_mesa": 5, "capacidad": 4, "estado": "disponible"}
@mainRoutes.route('/mesas', methods=['POST'])
def crearMesa():
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "Se requiere un payload con los datos de la mesa."}), 400

    try:
        restauranteServices.insertTabla('mesas', **payload)
        return jsonify({"mensaje": "Mesa creada correctamente", "data": payload}), 201
    except Exception as exc:
        return jsonify({"error": "No se pudo crear la mesa.", "detalle": str(exc)}), 500


# Detalle de una mesa específica.
# Uso: GET /mesa/<id>
@mainRoutes.route('/mesa/<int:id>')
def viewMesa(id):
    mesas = restauranteServices.selectTabla('mesas')
    for mesa in mesas:
        if mesa.get('id') == id:
            return jsonify(mesa)
    return jsonify({"error": "Mesa no encontrada"}), 404


# Actualizar una mesa existente (p. ej. cambiar su estado_mesa_id).
# Uso: PUT /mesas/<id>
# Body esperado: {"estado_mesa_id": 2}
@mainRoutes.route('/mesas/<int:id>', methods=['PUT'])
def actualizarMesa(id):
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "No se enviaron datos para actualizar."}), 400

    try:
        affected = restauranteServices.updateTabla('mesas', {'mesa_id': id}, **payload)
        if affected == 0:
            return jsonify({"error": "Mesa no encontrada."}), 404
        return jsonify({"mensaje": "Mesa actualizada correctamente"})
    except Exception as exc:
        return jsonify({"error": "No se pudo actualizar la mesa.", "detalle": str(exc)}), 500


# Listado de órdenes.
# Uso: GET /ordenes
@mainRoutes.route('/ordenes', methods=['GET'])
def viewPedidos():
    return jsonify(restauranteServices.obtener_ordenes())


# Crear nueva orden desde el frontend.
# Uso: POST /ordenes
# Body esperado: {"numero_mesa": 1, "platillo_id": 2, "cantidad": 3, "metodo_pago_id": 1}
@mainRoutes.route('/ordenes', methods=['POST'])
def crearOrden():
    payload = request.get_json(silent=True) or {}

    numero_mesa = payload.get('numero_mesa')
    platillo_id = payload.get('platillo_id')
    cantidad = payload.get('cantidad')
    metodo_pago_id = payload.get('metodo_pago_id')

    if None in (numero_mesa, platillo_id, cantidad, metodo_pago_id):
        return jsonify({"error": "Faltan datos obligatorios: numero_mesa, platillo_id, cantidad, metodo_pago_id."}), 400

    try:
        resultado = restauranteServices.registrar_nueva_orden(numero_mesa, platillo_id, cantidad, metodo_pago_id)
        return jsonify(resultado), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "No se pudo registrar la orden.", "detalle": str(exc)}), 500


# Detalle de una orden por ID.
# Uso: GET /ordenes/<id>
@mainRoutes.route('/ordenes/<int:id>', methods=['GET'])
def viewPedido(id):
    pedido = restauranteServices.obtener_orden_por_id(id)
    if pedido is None:
        return jsonify({"error": "Pedido no encontrado"}), 404
    return jsonify(pedido)


# Actualizar una orden existente.
# Uso: PUT /ordenes/<id>
@mainRoutes.route('/ordenes/<int:id>', methods=['PUT'])
def actualizarOrden(id):
    payload = request.get_json(silent=True) or {}
    if not payload:
        return jsonify({"error": "No se enviaron datos para actualizar."}), 400

    try:
        if "pedidos" in tablas:
            affected = restauranteServices.updateTabla("pedidos", {"id": id}, **payload)
        elif "ordenes" in tablas:
            affected = restauranteServices.updateTabla("ordenes", {"orden_id": id}, **payload)
        else:
            return jsonify({"error": "No existe la tabla de pedidos."}), 404

        if affected == 0:
            return jsonify({"error": "Pedido no encontrado."}), 404

        return jsonify({"mensaje": "Pedido actualizado correctamente"})
    except Exception as exc:
        return jsonify({"error": "No se pudo actualizar la orden.", "detalle": str(exc)}), 500


# Eliminar una orden.
# Uso: DELETE /ordenes/<id>
@mainRoutes.route('/ordenes/<int:id>', methods=['DELETE'])
def eliminarOrden(id):
    try:
        if "pedidos" in tablas:
            affected = restauranteServices.deleteTabla("pedidos", id=id)
        elif "ordenes" in tablas:
            affected = restauranteServices.deleteTabla("ordenes", orden_id=id)
        else:
            return jsonify({"error": "No existe la tabla de pedidos."}), 404

        if affected == 0:
            return jsonify({"error": "Pedido no encontrado."}), 404

        return jsonify({"mensaje": "Pedido eliminado correctamente"})
    except Exception as exc:
        return jsonify({"error": "No se pudo eliminar la orden.", "detalle": str(exc)}), 500


# Consulta de órdenes por mesa.
# Uso: GET /ordenes/mesa/<mesa_id>
@mainRoutes.route('/ordenes/mesa/<int:mesa_id>', methods=['GET'])
def viewPedidosMesa(mesa_id):
    return jsonify(restauranteServices.obtener_ordenes_por_mesa(mesa_id))


# Endpoints de depuración.
# Uso: GET /test/<tabla>
@mainRoutes.route('/test/<string:tabla>')
def test(tabla):
    return jsonify(restauranteServices.selectTabla(tabla))
