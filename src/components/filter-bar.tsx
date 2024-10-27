// FilterBar.tsx
import { Search, RotateCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const filters = [
  { id: 'all', label: 'All', count: 0 },
  { id: 'needs-supervision', label: 'Needs supervision', count: 0 },
  { id: 'auto-answered', label: 'Auto answered', count: 0 },
  { id: 'answered', label: 'Answered tickets', count: 0 },
];

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => Promise<void>;
  counts: Record<string, number>;
  isLoading: boolean; // Agregar isLoading a la interfaz
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onRefresh,
  counts,
  isLoading,
}: FilterBarProps) {
  const { toast } = useToast();

  const handleReload = async () => {
    toast({
      title: 'Refreshing tickets',
      description: 'Your ticket list is being updated...',
    });
    await onRefresh();
  };

  return (
    <div className="mb-8 space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <span className="rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            {counts.all || 0} total
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-full sm:w-[400px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 pl-12 pr-4 text-base"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleReload}
            className="h-11 w-11 shrink-0"
            disabled={isLoading} // Usar isLoading aquí
          >
            <RotateCw className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? 'default' : 'outline'}
            onClick={() => onFilterChange(filter.id)}
            className="h-10 px-4 text-sm"
          >
            {filter.label}
            <span className="ml-2 rounded-full bg-primary-foreground/10 px-2.5 py-0.5 text-xs font-medium">
              {counts[filter.id] || 0}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}