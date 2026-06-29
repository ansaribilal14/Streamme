// frontend/components/ui/Badge.tsx
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-surface-elevated text-text-secondary',
    accent: 'bg-accent text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-black',
    outline: 'border border-border text-text-secondary',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
}
