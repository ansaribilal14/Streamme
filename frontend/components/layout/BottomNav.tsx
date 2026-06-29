// frontend/components/layout/BottomNav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, History as HistoryIcon, Settings } from 'lucide-react';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/history', label: 'History', icon: HistoryIcon },
  { href: '/admin', label: 'Admin', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  // Hide bottom nav on the player page
  if (pathname === '/player') return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 transition-colors ${
                active ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
