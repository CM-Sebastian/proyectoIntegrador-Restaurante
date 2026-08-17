import sys
import os
from datetime import datetime

# Añadir el directorio raíz al path para importar app, models, config y create_db
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import create_db
from app import app
from models import (
    db, Usuario, PerfilUsuario, Mesa, Categoria, Platillo, 
    Ingrediente, PlatilloIngrediente, Orden, DetalleOrden, Factura, Reservacion
)

with app.app_context():
    print("Creando tablas para el sistema de restaurante...")
    db.drop_all()
    db.create_all()
    print("Tablas creadas con éxito.")

    # 1. Usuarios y Perfiles (1:1)
    admin = Usuario(nombre="Carlos Admin", email="admin@restaurante.com", rol="admin")
    admin.set_password("admin123")
    admin.perfil = PerfilUsuario(telefono="0991234567", direccion="Av. Principal 123", cedula_ruc="1712345678001")

    mesero = Usuario(nombre="Juan Mesero", email="mesero@restaurante.com", rol="mesero")
    mesero.set_password("mesero123")
    mesero.perfil = PerfilUsuario(telefono="0997654321", direccion="Calle Secundaria 456", cedula_ruc="1798765432001")

    cocinero = Usuario(nombre="Chef Mario", email="cocina@restaurante.com", rol="cocinero")
    cocinero.set_password("cocina123")

    cliente = Usuario(nombre="María López", email="cliente@gmail.com", rol="cliente")
    cliente.set_password("cliente123")
    cliente.perfil = PerfilUsuario(telefono="0988888888", direccion="Ciudadela El Sol Mz 5", cedula_ruc="1755555555")

    db.session.add_all([admin, mesero, cocinero, cliente])
    db.session.commit()

    # 2. Mesas del Restaurante
    m1 = Mesa(numero=1, capacidad=2, ubicacion="Interior", estado="ocupada")
    m2 = Mesa(numero=2, capacidad=4, ubicacion="Terraza", estado="disponible")
    m3 = Mesa(numero=3, capacidad=6, ubicacion="VIP", estado="reservada")
    db.session.add_all([m1, m2, m3])
    db.session.commit()

    # 3. Categorías y Platillos (1:N)
    cat_entradas = Categoria(nombre="Entradas", descripcion="Apetitosos platillos para empezar")
    cat_fuertes = Categoria(nombre="Platos Fuertes", descripcion="Nuestra especialidad de la casa")
    cat_bebidas = Categoria(nombre="Bebidas", descripcion="Refrescos, jugos y cócteles")

    p1 = Platillo(categoria=cat_entradas, codigo="ENT001", nombre="Empanadas de Queso", descripcion="3 empanadas crujientes de queso", precio=4.50, tiempo_preparacion_min=10)
    p2 = Platillo(categoria=cat_fuertes, codigo="PF001", nombre="Lomo Salteado", descripcion="Trozos de lomo de res con papas fritas y arroz", precio=12.90, tiempo_preparacion_min=25)
    p3 = Platillo(categoria=cat_bebidas, codigo="BEB001", nombre="Limonada Menta", descripcion="Limonada natural refrescante con menta", precio=3.00, tiempo_preparacion_min=5)

    db.session.add_all([cat_entradas, cat_fuertes, cat_bebidas, p1, p2, p3])
    db.session.commit()

    # 4. Ingredientes y Recetas (N:M)
    ing1 = Ingrediente(nombre="Lomo de Res", stock_actual=25.0, unidad_medida="kg")
    ing2 = Ingrediente(nombre="Papas", stock_actual=50.0, unidad_medida="kg")
    ing3 = Ingrediente(nombre="Queso", stock_actual=10.0, unidad_medida="kg")
    db.session.add_all([ing1, ing2, ing3])
    db.session.commit()

    r1 = PlatilloIngrediente(platillo=p2, ingrediente=ing1, cantidad_requerida=0.25)
    r2 = PlatilloIngrediente(platillo=p2, ingrediente=ing2, cantidad_requerida=0.30)
    r3 = PlatilloIngrediente(platillo=p1, ingrediente=ing3, cantidad_requerida=0.15)
    db.session.add_all([r1, r2, r3])
    db.session.commit()

    # 5. Orden y Detalles (1:N)
    orden1 = Orden(
        codigo_orden="ORD-2026-001",
        mesa_id=m1.id,
        cliente_id=cliente.id,
        mesero_id=mesero.id,
        tipo="en_mesa",
        estado="pagado",
        notas="Mesa junto a la ventana"
    )
    db.session.add(orden1)
    db.session.commit()

    d1 = DetalleOrden(orden_id=orden1.id, platillo_id=p1.id, cantidad=2, precio_unitario=p1.precio, subtotal=p1.precio * 2)
    d2 = DetalleOrden(orden_id=orden1.id, platillo_id=p2.id, cantidad=1, precio_unitario=p2.precio, subtotal=p2.precio * 1)
    d3 = DetalleOrden(orden_id=orden1.id, platillo_id=p3.id, cantidad=2, precio_unitario=p3.precio, subtotal=p3.precio * 2)

    db.session.add_all([d1, d2, d3])
    db.session.commit()

    # 6. Factura (1:1 con Orden)
    subtotal = orden1.calcular_total()  # (4.50*2) + 12.90 + (3.00*2) = 27.90
    iva = round(subtotal * 0.15, 2)
    propina = 2.00
    total = round(subtotal + iva + propina, 2)

    factura1 = Factura(
        orden=orden1,
        numero_factura="FAC-001-000123",
        cliente_nombre=cliente.nombre,
        cliente_identificacion=cliente.perfil.cedula_ruc,
        subtotal=subtotal,
        impuesto_iva=iva,
        propina=propina,
        total=total,
        metodo_pago="tarjeta_credito",
        estado="emitida"
    )
    db.session.add(factura1)

    # 7. Reservación
    res1 = Reservacion(
        cliente=cliente,
        mesa=m3,
        fecha_hora=datetime(2026, 8, 20, 20, 0),
        cantidad_personas=5,
        estado="confirmada",
        notas="Cumpleaños"
    )
    db.session.add(res1)
    db.session.commit()

    print("[OK] Datos de prueba de restaurante insertados correctamente en la base de datos.")
    print("\nResumen de datos cargados:")
    print(f" - Usuarios: {Usuario.query.count()} (con sus perfiles 1:1)")
    print(f" - Mesas: {Mesa.query.count()}")
    print(f" - Categorías: {Categoria.query.count()}")
    print(f" - Platillos: {Platillo.query.count()}")
    print(f" - Ingredientes: {Ingrediente.query.count()} (asociados N:M en recetas)")
    print(f" - Órdenes: {Orden.query.count()} (con detalles de pedido 1:N)")
    print(f" - Facturas: {Factura.query.count()} (vinculada 1:1 a Orden {orden1.codigo_orden})")
    print(f" - Reservaciones: {Reservacion.query.count()}")
