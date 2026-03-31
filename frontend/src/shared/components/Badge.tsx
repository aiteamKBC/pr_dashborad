
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'error' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    success: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    error: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    default: 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/20',
  };

  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap', variants[variant], className)}>
      {children}
    </span>
  );
}

export default Badge;
