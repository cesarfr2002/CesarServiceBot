import os
import logging
import imaplib
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_email_connection():
    # Cargar variables de entorno
    load_dotenv()
    
    # Obtener credenciales
    email_user = os.getenv("EMAIL_USER")
    email_password = os.getenv("EMAIL_PASSWORD")
    email_host = os.getenv("EMAIL_HOST")
    
    # Verificar que tengamos todas las credenciales
    logger.info(f"Email user: {email_user}")
    logger.info(f"Email host: {email_host}")
    logger.info(f"Password configurada: {'Sí' if email_password else 'No'}")
    
    if not all([email_user, email_password, email_host]):
        logger.error("Faltan credenciales")
        return
    
    try:
        # Intentar conexión
        logger.info(f"Intentando conectar a {email_host}...")
        mail = imaplib.IMAP4_SSL(email_host)
        logger.info("Conexión SSL establecida")
        
        # Intentar login
        logger.info("Intentando login...")
        mail.login(email_user, email_password)
        logger.info("Login exitoso")
        
        # Listar buzones disponibles
        logger.info("Listando buzones...")
        list_response = mail.list()
        logger.info(f"Buzones disponibles: {list_response}")
        
        # Intentar seleccionar inbox
        logger.info("Seleccionando inbox...")
        select_response = mail.select('inbox')
        logger.info(f"Respuesta de selección: {select_response}")
        
        # Cerrar conexión
        mail.logout()
        logger.info("Prueba completada exitosamente")
        
    except Exception as e:
        logger.error("Error durante la prueba")
        logger.exception(e)

if __name__ == "__main__":
    test_email_connection()