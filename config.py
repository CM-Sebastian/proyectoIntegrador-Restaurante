import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

class appConfig:
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "12345")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "fetchFood_db")

    #Flask Config 
    SECRET_KEY = "restaurante-flask" 

    #ORM Config
    #Uri alterada para deploy
    SQLALCHEMY_DATABASE_URI = os.getenv("DB_URI","")

    SQLALCHEMY_TRACK_MODIFICATIONS = False


    #Restauracion de DB
    BACKUP_FILE = os.getenv("DB_BACKUP")
