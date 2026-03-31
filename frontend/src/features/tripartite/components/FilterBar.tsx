import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface FilterBarProps {
  onFilterChange: (filters: any) => void;
  programmes: string[];
  groups: string[];
  coaches: Array<{ id: string; name: string }>;
}

export default function FilterBar({ onFilterChange, programmes, groups, coaches }: FilterBarProps) {
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    programme: '',
    group: '',
    coach_id: '',
    status: '',
    search: '',
  });

  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchDebounce }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      {/* Search row */}
      <div className="mb-4">
        <div className="relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
          <input
            type="text"
            placeholder="Search by learner, employer, or coach..."
            value={searchDebounce}
            onChange={(e) => setSearchDebounce(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <div>
          <label className={labelCls}>Date From</label>
          <input type="date" value={filters.date_from} onChange={(e) => handleChange('date_from', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date To</label>
          <input type="date" value={filters.date_to} onChange={(e) => handleChange('date_to', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Programme</label>
          <select value={filters.programme} onChange={(e) => handleChange('programme', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">All Programmes</option>
            {programmes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Group</label>
          <select value={filters.group} onChange={(e) => handleChange('group', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">All Groups</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Coach</label>
          <select value={filters.coach_id} onChange={(e) => handleChange('coach_id', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">All Coaches</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={filters.status} onChange={(e) => handleChange('status', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_SIGNOFF">Pending Sign-off</option>
            <option value="AT_RISK">At Risk</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => { setFilters({ date_from: '', date_to: '', programme: '', group: '', coach_id: '', status: '', search: '' }); setSearchDebounce(''); }}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <i className="ri-close-circle-line text-sm"></i>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}