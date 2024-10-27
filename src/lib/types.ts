// lib/types.ts
export interface EmailMessage {
  id: string;
  subject: string;
  content: string;
  from: string; // Agregar esta propiedad
  from_address: string;
  timestamp: string;
  type: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  origin: string;
  messages: EmailMessage[];
  created: string;
  lastMessage: string;
  sender: {
    email: string;
    name: string;
  };
  status: 'NEW' | 'PENDING' | 'CLOSED';
}


export interface Agent {
  name: string;
  description: string;
  skills: string[];
  context?: string;
}
