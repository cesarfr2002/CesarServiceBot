import { LayoutDashboard, FileText, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Tickets', icon: LayoutDashboard, count: 128, href: '#', current: true },
  { name: 'Templates', icon: FileText, href: '#', current: false },
  { name: 'Sources', icon: Share2, href: '#', current: false },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex h-16 items-center px-4 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg
                className="h-8 w-8 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="text-xl font-bold tracking-tight">CesarSup</span>
            </div>
            <div className="h-6 w-px bg-border/60" />
            <nav className="flex items-center gap-6">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    item.current ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {item.count && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary group-hover:bg-primary/20">
                      {item.count}
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}