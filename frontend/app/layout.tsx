// frontend/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'StreamHub — Your Personal Streaming Hub',
  description: 'Self-hosted streaming PWA with CloudStream extension support',
  manifest: '/manifest.json',
  applicationName: 'StreamHub',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StreamHub',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-background text-text-primary min-h-screen">
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 pb-24 md:pb-8">{children}</main>
          <BottomNav />
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          // Apply saved theme on initial load
          try {
            const t = localStorage.getItem('streamhub_theme');
            if (t === 'amoled') document.body.classList.add('theme-amoled');
            if (t === 'navy') document.body.classList.add('theme-navy');
          } catch {}
        `}} />
      </body>
    </html>
  );
}
