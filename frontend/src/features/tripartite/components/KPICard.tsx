interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  color?: string;
  iconBg?: string;
}

export default function KPICard({
  title,
  value,
  icon,
  trend,
  color = 'text-teal-600',
  iconBg = 'bg-teal-50',
}: KPICardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-snug">{title}</p>
        <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg ${iconBg}`}>
          <i className={`${icon} text-lg ${color}`}></i>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 leading-none tabular-nums">{value}</p>
        {trend && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{trend}</p>}
      </div>
    </div>
  );
}