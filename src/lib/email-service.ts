// lib/email-service.ts
export interface EmailResponse {
  message: string;
  response: string;
}

export class EmailService {
  private static API_URL = 'http://localhost:3000/api';

  static async fetchEmails(): Promise<any[]> {
    try {
      const response = await fetch(`${this.API_URL}/emails`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  static async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_URL}/health-check`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async sendEmail(ticketId: number, content: string, recipient: string): Promise<EmailResponse> {
    try {
      const response = await fetch(`${this.API_URL}/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          content,
          recipient,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}