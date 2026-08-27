from sqlalchemy.ext.automap import automap_base
from app import app

#en construccion: se usa relfexion con automap
with app.app_context():
    # 1. Crear una clase base para automap
    BaseReflejada = automap_base()
    
    # 2. Reflejar las tablas desde el motor de la base de datos (db.engine)
    BaseReflejada.prepare(autoload_with=db.engine)
    
    # 3. Acceder a los modelos mapeados automáticamente
    # Si tienes una tabla llamada 'usuarios', Automap creará una clase con el mismo nombre
    Usuario = BaseReflejada.classes.usuarios
    Pedido = BaseReflejada.classes.pedidos