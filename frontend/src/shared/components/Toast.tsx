import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: 'ri-checkbox-circle-fill text-primary-600',
    error: 'ri-error-warning-fill text-red-600',
    info: 'ri-information-fill text-blue-600',
  };

  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-center gap-3 min-w-[300px] transition-all duration-300 z-50',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="w-6 h-6 flex items-center justify-center">
        <i className={clsx(icons[type], 'text-xl')}></i>
      </div>
      <p className="text-sm text-gray-900 flex-1">{message}</p>
      <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="cursor-pointer">
        <i className="ri-close-line text-gray-400 hover:text-gray-600"></i>
      </button>
    </div>
  );
}