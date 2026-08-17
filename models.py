from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# ─────────────────────────────────────────────────────────────
# 1. USUARIOS Y PERFILES (Relación 1:1)
# ─────────────────────────────────────────────────────────────

class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(225), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default="cliente")  # admin, mesero, cocinero, cajero, cliente
    activo = db.Column(db.Boolean, default=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)

    # Relación 1:1 con PerfilUsuario
    perfil = db.relationship("PerfilUsuario", backref="usuario", uselist=False, cascade="all, delete-orphan")
    
    # Relaciones 1:N con Ordenes y Reservaciones
    ordenes_como_cliente = db.relationship("Orden", foreign_keys="Orden.cliente_id", backref="cliente", lazy=True)
    ordenes_como_mesero = db.relationship("Orden", foreign_keys="Orden.mesero_id", backref="mesero", lazy=True)
    reservaciones = db.relationship("Reservacion", backref="cliente", lazy=True)

    def set_password(self, password_plano):
        self.password_hash = generate_password_hash(password_plano)

    def check_password(self, password_plano):
        return check_password_hash(self.password_hash, password_plano)

    def __repr__(self):
        return f"<Usuario {self.email} ({self.rol})>"


class PerfilUsuario(db.Model):
    __tablename__ = "perfiles_usuario"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), unique=True, nullable=False)
    telefono = db.Column(db.String(20), nullable=True)
    direccion = db.Column(db.String(200), nullable=True)
    cedula_ruc = db.Column(db.String(30), nullable=True)
    fecha_nacimiento = db.Column(db.Date, nullable=True)

    def __repr__(self):
        return f"<PerfilUsuario usuario_id={self.usuario_id}>"


# ─────────────────────────────────────────────────────────────
# 2. MESAS DEL RESTAURANTE
# ─────────────────────────────────────────────────────────────

class Mesa(db.Model):
    __tablename__ = "mesas"

    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.Integer, unique=True, nullable=False)
    capacidad = db.Column(db.Integer, nullable=False, default=4)
    ubicacion = db.Column(db.String(50), default="Interior")  # Interior, Terraza, VIP, Bar
    estado = db.Column(db.String(20), default="disponible")    # disponible, ocupada, reservada, mantenimiento

    # Relaciones 1:N
    ordenes = db.relationship("Orden", backref="mesa", lazy=True)
    reservaciones = db.relationship("Reservacion", backref="mesa", lazy=True)

    def __repr__(self):
        return f"<Mesa #{self.numero} ({self.ubicacion}) Capacidad:{self.capacidad}>"


# ─────────────────────────────────────────────────────────────
# 3. CATEGORÍAS Y PLATILLOS (Relación 1:N)
# ─────────────────────────────────────────────────────────────

class Categoria(db.Model):
    __tablename__ = "categorias"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), nullable=False, unique=True)
    descripcion = db.Column(db.Text, nullable=True)
    activa = db.Column(db.Boolean, default=True)

    # Relación 1:N con Platillos
    platillos = db.relationship("Platillo", backref="categoria", lazy=True)

    def __repr__(self):
        return f"<Categoria {self.nombre}>"


class Platillo(db.Model):
    __tablename__ = "platillos"

    id = db.Column(db.Integer, primary_key=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey("categorias.id"), nullable=False)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    precio = db.Column(db.Float, nullable=False)
    disponible = db.Column(db.Boolean, default=True)
    tiempo_preparacion_min = db.Column(db.Integer, default=15)

    def __repr__(self):
        return f"<Platillo {self.codigo} - {self.nombre} (${self.precio:.2f})>"


# ─────────────────────────────────────────────────────────────
# 4. INGREDIENTES Y RECETAS (Relación N:M entre Platillos e Ingredientes)
# ─────────────────────────────────────────────────────────────

class Ingrediente(db.Model):
    __tablename__ = "ingredientes"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)
    stock_actual = db.Column(db.Float, default=0.0)
    unidad_medida = db.Column(db.String(20), default="unidades")  # kg, gr, litros, unidades

    def __repr__(self):
        return f"<Ingrediente {self.nombre}: {self.stock_actual} {self.unidad_medida}>"


class PlatilloIngrediente(db.Model):
    """Tabla de asociación N:M para la receta de un platillo"""
    __tablename__ = "platillo_ingredientes"

    id = db.Column(db.Integer, primary_key=True)
    platillo_id = db.Column(db.Integer, db.ForeignKey("platillos.id"), nullable=False)
    ingrediente_id = db.Column(db.Integer, db.ForeignKey("ingredientes.id"), nullable=False)
    cantidad_requerida = db.Column(db.Float, nullable=False)

    platillo = db.relationship("Platillo", backref=db.backref("receta", cascade="all, delete-orphan"))
    ingrediente = db.relationship("Ingrediente", backref=db.backref("platillos_asociados", cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<Receta {self.platillo.nombre} -> {self.cantidad_requerida} {self.ingrediente.unidad_medida} de {self.ingrediente.nombre}>"


# ─────────────────────────────────────────────────────────────
# 5. ÓRDENES Y DETALLES DE ÓRDENES (Relación 1:N)
# ─────────────────────────────────────────────────────────────

class Orden(db.Model):
    __tablename__ = "ordenes"

    id = db.Column(db.Integer, primary_key=True)
    codigo_orden = db.Column(db.String(30), unique=True, nullable=False)
    mesa_id = db.Column(db.Integer, db.ForeignKey("mesas.id"), nullable=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    mesero_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    tipo = db.Column(db.String(20), default="en_mesa")  # en_mesa, para_llevar, domicilio
    estado = db.Column(db.String(20), default="pendiente")  # pendiente, en_cocina, listo, servido, pagado, cancelado
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    notas = db.Column(db.Text, nullable=True)

    # Relación 1:N con DetalleOrden
    detalles = db.relationship("DetalleOrden", backref="orden", cascade="all, delete-orphan", lazy=True)

    # Relación 1:1 con Factura
    factura = db.relationship("Factura", backref="orden", uselist=False, cascade="all, delete-orphan")

    def calcular_total(self):
        return sum(d.subtotal for d in self.detalles)

    def __repr__(self):
        return f"<Orden {self.codigo_orden} Estado:{self.estado}>"


class DetalleOrden(db.Model):
    __tablename__ = "detalles_orden"

    id = db.Column(db.Integer, primary_key=True)
    orden_id = db.Column(db.Integer, db.ForeignKey("ordenes.id"), nullable=False)
    platillo_id = db.Column(db.Integer, db.ForeignKey("platillos.id"), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False, default=1)
    precio_unitario = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    notas_preparacion = db.Column(db.String(255), nullable=True)

    platillo = db.relationship("Platillo")

    def __repr__(self):
        return f"<DetalleOrden {self.cantidad}x {self.platillo.nombre} Subtotal:${self.subtotal:.2f}>"


# ─────────────────────────────────────────────────────────────
# 6. FACTURAS (Relación 1:1 con Orden)
# ─────────────────────────────────────────────────────────────

class Factura(db.Model):
    __tablename__ = "facturas"

    id = db.Column(db.Integer, primary_key=True)
    orden_id = db.Column(db.Integer, db.ForeignKey("ordenes.id"), unique=True, nullable=False)
    numero_factura = db.Column(db.String(30), unique=True, nullable=False)
    cliente_nombre = db.Column(db.String(100), nullable=False)
    cliente_identificacion = db.Column(db.String(50), nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    impuesto_iva = db.Column(db.Float, default=0.0)
    propina = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, nullable=False)
    metodo_pago = db.Column(db.String(30), nullable=False, default="efectivo")  # efectivo, tarjeta_credito, tarjeta_debito, transferencia
    fecha_emision = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default="emitida")  # emitida, anulada

    def __repr__(self):
        return f"<Factura {self.numero_factura} Total:${self.total:.2f} ({self.estado})>"


# ─────────────────────────────────────────────────────────────
# 7. RESERVACIONES (Relación 1:N con Usuario y Mesa)
# ─────────────────────────────────────────────────────────────

class Reservacion(db.Model):
    __tablename__ = "reservaciones"

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    mesa_id = db.Column(db.Integer, db.ForeignKey("mesas.id"), nullable=False)
    fecha_hora = db.Column(db.DateTime, nullable=False)
    cantidad_personas = db.Column(db.Integer, nullable=False)
    estado = db.Column(db.String(20), default="confirmada")  # confirmada, cancelada, completada
    notas = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<Reservacion ClienteID:{self.cliente_id} MesaID:{self.mesa_id} Fecha:{self.fecha_hora}>"