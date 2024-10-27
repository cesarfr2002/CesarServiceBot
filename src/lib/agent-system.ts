import { Groq } from 'groq-sdk';

interface Agent {
  name: string;
  description: string;
  skills: string[];
  context?: string;
}

interface EmailMessage {
  id: string;
  subject: string;
  content: string;
  from: string;
  timestamp: string;
  type: 'received' | 'sent';
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
  status: 'NEW' | 'OPEN' | 'PENDING' | 'CLOSED';
}

export class SimpleAgentSystem {
  private client: Groq;
  private agents: Record<string, Agent> = {};
  private defaultAgent: Agent | null = null;
  private knowledgeBase: Record<string, string> = {};

  constructor(groqApiKey: string) {
    this.client = new Groq({
      apiKey: groqApiKey,
      dangerouslyAllowBrowser: true, // Permite el uso de la clave API en el navegador
    });
  }

  /**
   * Adds an agent to the system.
   * @param name - The name of the agent.
   * @param description - A brief description of the agent's role.
   * @param skills - An array of skills that the agent is proficient in.
   */
  addAgent(name: string, description: string, skills: string[]): void {
    this.agents[name] = { name, description, skills };
    console.log(`✓ Agent '${name}' added to the system`);
  }

  /**
   * Sets the default agent for the system.
   * @param name - The name of the agent.
   * @param description - A brief description of the agent's role.
   * @param skills - An array of skills that the agent is proficient in.
   */
  setDefaultAgent(name: string, description: string, skills: string[]): void {
    this.defaultAgent = { name, description, skills };
    console.log(`✓ Default agent '${name}' configured`);
  }

  /**
   * Selects the best agent based on the provided query.
   * @param query - The query to match against available agents.
   * @returns The selected agent or the default agent if none is found.
   */
  async selectAgent(query: string): Promise<Agent | null> {
    console.log('Selecting best agent for the query...');

    const prompt = `Based on the following query, select the best agent:
    Query: ${query}
    
    Available agents:
    ${JSON.stringify(Object.values(this.agents), null, 2)}
    
    Respond only with the name of the most appropriate agent.`;

    try {
      const response = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0,
      });

      const selectedAgent = response.choices[0].message.content.trim();
      const agent = this.agents[selectedAgent];

      if (agent) {
        console.log(`→ Selected agent: ${agent.name}`);
        return agent;
      } else {
        console.log('⚠ No specific agent found, using default agent');
        return this.defaultAgent;
      }
    } catch (e) {
      console.error('⚠ Error in agent selection:', e);
      return this.defaultAgent;
    }
  }

  /**
   * Processes an email query and generates a response.
   * @param query - The subject of the email.
   * @param emailContent - The content of the email.
   * @returns A promise that resolves to the generated response.
   */
  async processQuery(query: string, emailContent: string): Promise<string> {
    console.log(`Processing email with subject: '${query}'`);

    const agent = await this.selectAgent(emailContent);
    if (!agent) {
      return 'Could not determine the appropriate department for this query.';
    }

    const context = Object.values(this.knowledgeBase).join('\n');

    console.log('Generating response...');

    const prompt = `As a customer service representative, generate a professional 
    and empathetic response to the following email:
    
    Business context: ${context}
    
    Email subject: ${query}
    Email content: ${emailContent}
    
    Instructions:
    1. Maintain a professional and friendly tone
    2. Address all points mentioned in the email
    3. Provide clear and specific solutions
    4. Include an appropriate greeting and formal closing
    5. If follow-up is required, indicate it clearly
    
    As a ${agent.description}, generate a complete and helpful response.`;

    try {
      const response = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (e) {
      console.error('Error generating response:', e);
      return "I apologize, but I'm unable to generate a response at the moment. Please try again later.";
    }
  }
}

// Initialize the agent system
const agentSystem = new SimpleAgentSystem(
  import.meta.env.VITE_GROQ_API_KEY || ''
);

// Configure default agent
agentSystem.setDefaultAgent(
  'customer_service',
  'general customer service specialist',
  ['customer service', 'general inquiries', 'basic assistance']
);

// Configure other agents
agentSystem.addAgent(
  'technical_support',
  'specialist in resolving technical issues',
  ['troubleshooting', 'configuration', 'technical problems']
);

agentSystem.addAgent('sales', 'specialist in sales and product inquiries', [
  'products',
  'pricing',
  'promotions',
]);

export { agentSystem };
