import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dataclasses import dataclass
from groq import Groq
import imaplib
import email
from email.policy import default
import os
from datetime import datetime
import json
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Cargar variables de entorno al inicio
load_dotenv()
logger.debug("Cargando variables de entorno:")
logger.debug(f"EMAIL_USER: {os.getenv('EMAIL_USER')}")
logger.debug(f"EMAIL_PASSWORD: {'*'*len(os.getenv('EMAIL_PASSWORD')) if os.getenv('EMAIL_PASSWORD') else 'Not set'}")
logger.debug(f"EMAIL_HOST: {os.getenv('EMAIL_HOST')}")
logger.debug(f"GROQ_API_KEY: {'*'*len(os.getenv('GROQ_API_KEY')) if os.getenv('GROQ_API_KEY') else 'Not set'}")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class EmailMessage(BaseModel):
    id: str
    subject: str
    content: str
    from_address: str
    timestamp: str
    type: str

class Ticket(BaseModel):
    id: int
    title: str
    description: str
    origin: str
    messages: List[EmailMessage]
    created: str
    lastMessage: str
    sender: dict
    status: str

class EmailResponse(BaseModel):
    ticketId: int
    content: str
    recipient: str

@dataclass
class Agent:
    name: str
    description: str
    skills: List[str]
    context: str = ""

class SimpleAgentSystem:
    def __init__(self, groq_api_key: str, email_user: str, email_password: str, email_host: str):
        logger.debug(f"Inicializando SimpleAgentSystem con email_user: {email_user}, email_host: {email_host}")
        self.client = Groq(api_key=groq_api_key)
        self.agents = {}
        self.knowledge_base = {}
        self.email_user = email_user
        self.email_password = email_password
        self.email_host = email_host
        self.default_agent = None

    def add_agent(self, name: str, description: str, skills: List[str]):
        logger.debug(f"Añadiendo agente: {name} con habilidades: {skills}")
        self.agents[name] = Agent(name=name, description=description, skills=skills)

    def set_default_agent(self, name: str, description: str, skills: List[str]):
        logger.debug(f"Estableciendo agente predeterminado: {name} con habilidades: {skills}")
        self.default_agent = Agent(name=name, description=description, skills=skills)

    async def select_agent(self, query: str):
        logger.debug(f"Seleccionando agente para la consulta: {query}")
        prompt = f"""Based on the following query, select the best agent:
        Query: {query}
        
        Available agents:
        {json.dumps([{'name': a.name, 'description': a.description, 'skills': a.skills} 
                    for a in self.agents.values()], indent=2, ensure_ascii=False)}
        
        Respond only with the name of the most appropriate agent."""
        
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="mixtral-8x7b-32768",
                temperature=0
            )
            selected_agent = response.choices[0].message.content.strip()
            logger.debug(f"Agente seleccionado: {selected_agent}")
            return self.agents.get(selected_agent, self.default_agent)
        except Exception as e:
            logger.error(f"Error al seleccionar agente: {e}")
            return self.default_agent

    async def process_query(self, query: str, email_content: str) -> str:
        logger.debug(f"Procesando consulta: {query} con contenido: {email_content}")
        agent = await self.select_agent(email_content)
        if not agent:
            logger.warning("No se pudo determinar el departamento apropiado para esta consulta.")
            return "No se pudo determinar el departamento apropiado para esta consulta."
            
        context = "\n".join(self.knowledge_base.values())
        
        prompt = f"""Como representante de atención al cliente, genera una respuesta profesional 
        y empática al siguiente correo electrónico:
        
        Contexto del negocio: {context}
        
        Asunto del correo: {query}
        Contenido del correo: {email_content}
        
        Instrucciones:
        1. Mantén un tono profesional y amigable
        2. Aborda todos los puntos mencionados en el correo
        3. Proporciona soluciones claras y específicas
        4. Incluye un saludo apropiado y una despedida formal
        5. Si se requiere seguimiento, indícalo claramente
        
        Como un {agent.description}, genera una respuesta completa y útil."""
        
        response = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="mixtral-8x7b-32768",
            temperature=0.7
        )
        logger.debug(f"Respuesta generada: {response.choices[0].message.content}")
        return response.choices[0].message.content

# Initialize the agent system
EMAIL_USER = os.getenv("EMAIL_USER", "your-email@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")
EMAIL_HOST = os.getenv("EMAIL_HOST", "imap.gmail.com")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your-groq-api-key")

agent_system = SimpleAgentSystem(
    groq_api_key=GROQ_API_KEY,
    email_user=EMAIL_USER,
    email_password=EMAIL_PASSWORD,
    email_host=EMAIL_HOST
)

# Configure agents
agent_system.set_default_agent(
    "customer_service",
    "general customer service specialist",
    ["customer service", "general inquiries", "basic assistance"]
)

agent_system.add_agent(
    "technical_support",
    "specialist in resolving technical issues",
    ["troubleshooting", "configuration", "technical problems"]
)

agent_system.add_agent(
    "sales",
    "specialist in sales and product inquiries",
    ["products", "pricing", "promotions"]
)

# Email processing functions
def get_emails_from_inbox() -> List[Ticket]:
    logger.debug("Iniciando fetch de correos del inbox")
    try:
        mail = imaplib.IMAP4_SSL(EMAIL_HOST)
        mail.login(EMAIL_USER, EMAIL_PASSWORD)
        mail.select('inbox')
        
        result, data = mail.search(None, 'ALL')
        if result != 'OK':
            logger.error("No se pudieron obtener los correos")
            raise HTTPException(status_code=500, detail="Could not fetch emails")

        # Obtener solo el último correo
        if not data[0]:
            logger.warning("No hay correos en el inbox")
            return []

        last_email_id = data[0].split()[-1]
        result, data = mail.fetch(last_email_id, '(RFC822)')
        if result != 'OK':
            logger.warning(f"No se pudo obtener el correo con ID: {last_email_id}")
            return []

        email_msg = email.message_from_bytes(data[0][1], policy=default)
        
        content = ""
        if email_msg.is_multipart():
            for part in email_msg.walk():
                if part.get_content_type() == "text/plain":
                    charset = part.get_content_charset()
                    if charset is None:
                        charset = 'utf-8'
                    try:
                        content = part.get_payload(decode=True).decode(charset, errors='replace')
                    except Exception as e:
                        logger.warning(f"Error al decodificar el contenido del correo: {e}")
                        content = part.get_payload(decode=True).decode('latin-1', errors='replace')
                    break
        else:
            charset = email_msg.get_content_charset()
            if charset is None:
                charset = 'utf-8'
            try:
                content = email_msg.get_payload(decode=True).decode(charset, errors='replace')
            except Exception as e:
                logger.warning(f"Error al decodificar el contenido del correo: {e}")
                content = email_msg.get_payload(decode=True).decode('latin-1', errors='replace')
        
        message = EmailMessage(
            id=last_email_id.decode(),
            subject=email_msg['subject'] or "No Subject",
            content=content,
            from_address=email_msg['from'],
            timestamp=email_msg['date'],
            type='received'
        )
        
        ticket = Ticket(
            id=1,  # Puedes ajustar esto para que sea incremental
            title=email_msg['subject'] or "No Subject",
            description=content[:200] + "..." if len(content) > 200 else content,
            origin="email",
            messages=[message],
            created=email_msg['date'],
            lastMessage=email_msg['date'],
            sender={
                "email": email_msg['from'],
                "name": email_msg['from'].split('<')[0].strip() if '<' in email_msg['from'] else email_msg['from']
            },
            status="NEW"
        )
        
        logger.debug(f"Se obtuvo 1 correo")
        return [ticket]

    except Exception as e:
        logger.error(f"Error al obtener correos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# API endpoints
@app.get("/api/emails", response_model=List[Ticket])
async def fetch_emails():
    logger.debug("Llamada a endpoint /api/emails")
    try:
        return get_emails_from_inbox()
    except Exception as e:
        logger.error(f"Error en endpoint /api/emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/emails/send")
async def send_email(email_data: EmailResponse):
    logger.debug(f"Llamada a endpoint /api/emails/send con datos: {email_data}")
    try:
        # Process the email with the LLM
        response = await agent_system.process_query(
            f"Re: Ticket #{email_data.ticketId}",
            email_data.content
        )
        
        # Here you would typically send the email
        # For now, we'll just return the LLM response
        logger.debug(f"Respuesta generada: {response}")
        return {"message": "Email processed successfully", "response": response}
    except Exception as e:
        logger.error(f"Error en endpoint /api/emails/send: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/emails/generate-response")
async def generate_response(ticket: Ticket):
    logger.debug(f"Llamada a endpoint /api/emails/generate-response con datos: {ticket}")
    try:
        # Process the email with the LLM
        response = await agent_system.process_query(
            ticket.title,
            ticket.messages[-1].content
        )
        
        logger.debug(f"Respuesta generada: {response}")
        return {"response": response}
    except Exception as e:
        logger.error(f"Error en endpoint /api/emails/generate-response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health-check", response_model=dict)
async def health_check():
    logger.debug("Llamada a endpoint /api/health-check")
    return {"status": "OK"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)