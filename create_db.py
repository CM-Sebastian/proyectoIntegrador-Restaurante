import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("DB_USER", "postgres")
password = os.getenv("DB_PASSWORD", "12345")
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "restaurante_db")

try:
    conn = psycopg2.connect(
        dbname="postgres",
        user=user,
        password=password,
        host=host,
        port=port
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
    exists = cur.fetchone()
    
    if not exists:
        print(f"La base de datos '{db_name}' no existe. Creándola...")
        # Database names cannot be parameterized in DDL, but db_name comes from trusted env
        cur.execute(f'CREATE DATABASE "{db_name}";')
        print(f"Base de datos '{db_name}' creada exitosamente.")
    else:
        print(f"La base de datos '{db_name}' ya existe.")
        
    cur.close()
    conn.close()
except Exception as e:
    print("Error al verificar/crear la base de datos:", e)
