import subprocess
from config import Config

appConfig = Config()

def restaurar_base_datos(config_cmd):
    
    # Si usas un archivo comprimido o personalizado de pg_dump, usa 'pg_restore':
    cmd = config_cmd
    print(cmd)
    try:
        # Ejecutar el proceso
        resultado = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("Base de datos restaurada con éxito.")
    except subprocess.CalledProcessError as e:
        print(f"Error al restaurar: {e.stderr}")

# Ejemplo de uso
restaurar_base_datos(appConfig.RESTORE_PG_CMD)
