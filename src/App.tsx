// App.tsx
import { useState, useCallback, useEffect } from 'react';
import { Header } from '@/components/header';
import { TicketsTable } from '@/components/tickets/tickets-table';
import { FilterBar } from '@/components/filter-bar';
import { ThemeProvider } from '@/components/theme-provider';
import { EmailService } from '@/lib/email-service';
import type { Ticket, EmailMessage } from '@/lib/types';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEmails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const isAvailable = await EmailService.checkConnection();
      if (!isAvailable) {
        throw new Error('El servicio de correo no está disponible');
      }

      const emails = await EmailService.fetchEmails();
      setTickets(emails);
      console.log(`Se cargaron ${emails.length} tickets exitosamente`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar los correos';
      setError(errorMessage);
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadEmailsWithRetry = async () => {
      let retries = 3;
      while (retries > 0) {
        try {
          await refreshEmails();
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            setError('No se pudo conectar después de varios intentos');
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    };

    loadEmailsWithRetry();

    const intervalId = setInterval(refreshEmails, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [refreshEmails]);

  const processTicket = useCallback(async (ticketId: number, content: string, recipient: string) => {
    try {
      const response = await EmailService.sendEmail(ticketId, content, recipient);

      if (response.message === "Email processed successfully") {
        setTickets((prevTickets) =>
          prevTickets.map((ticket) => {
            if (ticket.id === ticketId) {
              const newMessage: EmailMessage = {
                id: Date.now().toString(),
                subject: `Re: Ticket #${ticketId}`,
                content: response.response,
                from: 'system@example.com',
                from_address: 'system@example.com',
                timestamp: new Date().toISOString(),
                type: 'sent'
              };

              return {
                ...ticket,
                status: 'PENDING',
                messages: [...ticket.messages, newMessage],
                lastMessage: new Date().toISOString()
              };
            }
            return ticket;
          })
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el ticket';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const getCounts = useCallback(() => ({
    all: tickets.length,
    'needs-supervision': tickets.filter((t) => t.status === 'NEW').length,
    'auto-answered': tickets.filter((t) => t.status === 'PENDING').length,
    answered: tickets.filter((t) => t.status === 'CLOSED').length,
  }), [tickets]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="crm-theme">
      <div className="min-h-screen bg-background">
        <Header />
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mx-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <main className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onRefresh={refreshEmails}
              counts={getCounts()}
              isLoading={isLoading}
            />
            <TicketsTable
              searchQuery={searchQuery}
              activeFilter={activeFilter}
              tickets={tickets}
              setTickets={setTickets}
              onProcessTicket={processTicket}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;