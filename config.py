import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

class Config:
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "12345")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "restaurante_db")

    #Flask Config 
    SECRET_KEY = "restaurante-flask" 

    #ORM Config
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False


    #Restauracion de DB
    BACKUP_FILE = os.getenv("DB_BACKUP")
    RESTORE_PG_CMD = ["pg_restore", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER, "-d", DB_NAME,BACKUP_FILE]