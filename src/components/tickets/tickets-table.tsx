// TicketsTable.tsx
import { Mail, Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { agentSystem } from '@/lib/agent-system';
import type { Ticket, EmailMessage } from '@/lib/types';

const statusStyles = {
  NEW: {
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: '🔴',
  },
  OPEN: {
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    icon: '🟠',
  },
  PENDING: {
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: '🟡',
  },
  CLOSED: {
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: '🟢',
  },
};

interface TicketsTableProps {
  searchQuery: string;
  activeFilter: string;
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  onProcessTicket: (ticketId: number, content: string, recipient: string) => Promise<void>;
  isLoading: boolean; // Agregar isLoading a la interfaz
}

export function TicketsTable({
  searchQuery,
  activeFilter,
  tickets,
  setTickets,
  onProcessTicket,
  isLoading,
}: TicketsTableProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const generateResponse = async (ticket: Ticket) => {
    setIsGeneratingResponse(true);
    try {
      const response = await fetch('http://localhost:3000/api/emails/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticket),
      });
  
      if (!response.ok) {
        throw new Error('Failed to generate AI response. Please try again.');
      }
  
      const data = await response.json();
      const newMessage: EmailMessage = {
        id: Date.now().toString(),
        subject: `Re: ${ticket.title}`,
        content: data.response,
        from: "cesar@sup.com",
        from_address: "cesar@sup.com",
        timestamp: new Date().toISOString(),
        type: "sent"
      };
  
      setTickets(tickets.map(t => {
        if (t.id === ticket.id) {
          return {
            ...t,
            messages: [...t.messages, newMessage],
            status: 'PENDING',
            lastMessage: new Date().toISOString()
          };
        }
        return t;
      }));
  
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage],
        status: 'PENDING',
        lastMessage: new Date().toISOString()
      } : null);
  
      toast({
        title: 'Response generated',
        description: 'AI response has been generated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate AI response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const sendResponse = async (ticket: Ticket) => {
    setIsSending(true);
    try {
      const lastMessage = ticket.messages[ticket.messages.length - 1];
      await onProcessTicket(ticket.id, lastMessage.content, ticket.sender.email);

      setTickets(tickets.map(t => {
        if (t.id === ticket.id) {
          return {
            ...t,
            status: 'CLOSED'
          };
        }
        return t;
      }));

      setSelectedTicket(prev => prev ? {
        ...prev,
        status: 'CLOSED'
      } : null);

      toast({
        title: 'Response sent',
        description: 'The email has been sent to the customer.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.sender.email.toLowerCase().includes(searchLower) ||
        ticket.sender.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }).filter(ticket => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'needs-supervision') return ticket.status === 'NEW';
    if (activeFilter === 'auto-answered') return ticket.status === 'PENDING';
    if (activeFilter === 'answered') return ticket.status === 'CLOSED';
    return true;
  });

  return (
    <>
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[400px] py-4 font-medium">Info</TableHead>
              <TableHead className="w-[100px] font-medium">Origin</TableHead>
              <TableHead className="w-[120px] text-center font-medium">Messages</TableHead>
              <TableHead className="w-[160px] font-medium">Created</TableHead>
              <TableHead className="w-[160px] font-medium">Last message</TableHead>
              <TableHead className="w-[240px] font-medium">Sender</TableHead>
              <TableHead className="w-[140px] font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="font-medium leading-none">{ticket.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {ticket.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/50 transition-colors hover:bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Badge variant="secondary" className="h-6 min-w-[2.5rem] px-2">
                        {ticket.messages.length}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(ticket.created), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(ticket.lastMessage), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8 border-2 border-background text-base">
                        <AvatarFallback className="text-base" initials={ticket.sender.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                        />
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">
                          {ticket.sender.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ticket.sender.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-6 gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium',
                        statusStyles[ticket.status].color
                      )}
                    >
                      <span className="text-xs">
                        {statusStyles[ticket.status].icon}
                      </span>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {selectedTicket?.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg p-4",
                    message.type === "received" 
                      ? "bg-muted/50 ml-0 mr-12"
                      : "bg-primary/10 ml-12 mr-0"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{message.from}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.timestamp), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateResponse(selectedTicket!)}
              disabled={isGeneratingResponse || selectedTicket?.status === 'CLOSED' || isLoading}
            >
              {isGeneratingResponse ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate AI Response'
              )}
            </Button>
            <Button
              onClick={() => sendResponse(selectedTicket!)}
              disabled={
                isSending ||
                selectedTicket?.status === 'CLOSED' ||
                selectedTicket?.messages[selectedTicket.messages.length - 1].type !== 'sent' ||
                isLoading
              }
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}