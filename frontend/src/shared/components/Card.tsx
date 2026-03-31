
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'flat' | 'elevated';
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-white rounded-xl border border-gray-200 shadow-sm',
    flat: 'bg-white rounded-xl border border-gray-200',
    elevated: 'bg-white rounded-xl border border-gray-200 shadow-md',
  };

  return (
    <div className={clsx(variants[variant], className)}>
      {children}
    </div>
  );
}

export default Card;