
from ..database.models import Categorias,db
  
#Aqui inicializar las clase de todas las db
categoria = Categorias()

#Funciones o clases para usar queries

def consulta_Categ():
    return db.session.execute(db.select(Categorias))