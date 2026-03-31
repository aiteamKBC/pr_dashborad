export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-6xl' : 'text-4xl';
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-12 h-12 flex items-center justify-center">
        <i className={`ri-loader-4-line ${sizeClass} text-teal-600 animate-spin`}></i>
      </div>
    </div>
  );
}

export default LoadingSpinner;