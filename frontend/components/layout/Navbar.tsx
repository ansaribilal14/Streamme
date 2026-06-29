// frontend/components/layout/Navbar.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Home, History as HistoryIcon, Heart, Settings, Film } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== '/search') setSearchOpen(false);
  }, [pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
    }
  };

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/history', label: 'History', icon: HistoryIcon },
    { href: '/favorites', label: 'Favorites', icon: Heart },
    { href: '/admin', label: 'Admin', icon: Settings },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/95 backdrop-blur-md shadow-lg' : 'bg-gradient-to-b from-background/90 to-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-8 py-3 safe-top">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center group-hover:bg-accent-hover transition-colors">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight hidden sm:block">
              Stream<span className="text-accent">Hub</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors flex items-center gap-2 ${
                    active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center bg-surface rounded-md border border-border">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search titles..."
                autoFocus
                className="bg-transparent px-3 py-1.5 text-sm w-44 sm:w-64 outline-none"
              />
              <button type="submit" className="px-3 py-1.5 text-accent">
                <Search className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          <button
            className="p-2 text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
