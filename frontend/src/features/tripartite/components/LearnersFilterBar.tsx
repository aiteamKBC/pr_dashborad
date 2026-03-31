import { useState, useEffect } from 'react';
import { LearnerListParams } from '../../../shared/types/learner';

interface LearnersFilterBarProps {
  filters: LearnerListParams;
  onFilterChange: (filters: Partial<LearnerListParams>) => void;
  totalCount: number;
}

export default function LearnersFilterBar({ filters, onFilterChange, totalCount }: LearnersFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ search: searchInput || undefined });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeFilterCount = [
    filters.status,
    filters.coach_id,
    filters.programme,
    filters.group,
    filters.due_date_from,
    filters.due_date_to,
  ].filter(Boolean).length;

  const selectCls = 'px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer transition-shadow';
  const dateCls = 'px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer transition-shadow';

  return (
    <div className="mb-5 space-y-3">
      {/* Search + results count row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by learner name, email, or employer..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
          />
        </div>
        <span className="flex-shrink-0 text-sm text-gray-500 tabular-nums whitespace-nowrap">
          <span className="font-semibold text-gray-900">{totalCount}</span> {totalCount === 1 ? 'learner' : 'learners'}
        </span>
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filters.status || ''} onChange={(e) => onFilterChange({ status: e.target.value as any || undefined })} className={selectCls}>
          <option value="">All statuses</option>
          <option value="NOT_STARTED">Not started</option>
          <option value="DUE_SOON">Due soon</option>
          <option value="OVERDUE">Overdue</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select value={filters.coach_id || ''} onChange={(e) => onFilterChange({ coach_id: e.target.value || undefined })} className={selectCls}>
          <option value="">All coaches</option>
          <option value="coach-1">Sarah Mitchell</option>
          <option value="coach-2">James Thompson</option>
          <option value="coach-3">Emma Wilson</option>
          <option value="coach-4">Michael Brown</option>
          <option value="coach-5">Rachel Green</option>
        </select>

        <select value={filters.programme || ''} onChange={(e) => onFilterChange({ programme: e.target.value || undefined })} className={selectCls}>
          <option value="">All programmes</option>
          <option value="Level 3 Business Administrator">Level 3 Business Administrator</option>
          <option value="Level 3 Customer Service Specialist">Level 3 Customer Service Specialist</option>
          <option value="Level 4 Data Analyst">Level 4 Data Analyst</option>
          <option value="Level 5 Operations Manager">Level 5 Operations Manager</option>
          <option value="Level 6 Digital Marketing">Level 6 Digital Marketing</option>
        </select>

        <select value={filters.group || ''} onChange={(e) => onFilterChange({ group: e.target.value || undefined })} className={selectCls}>
          <option value="">All groups</option>
          <option value="Cohort 2023-A">Cohort 2023-A</option>
          <option value="Cohort 2023-B">Cohort 2023-B</option>
          <option value="Cohort 2024-A">Cohort 2024-A</option>
          <option value="Cohort 2024-B">Cohort 2024-B</option>
          <option value="Cohort 2024-C">Cohort 2024-C</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Due:</span>
          <input type="date" value={filters.due_date_from || ''} onChange={(e) => onFilterChange({ due_date_from: e.target.value || undefined })} className={dateCls} />
          <span className="text-xs text-gray-400">–</span>
          <input type="date" value={filters.due_date_to || ''} onChange={(e) => onFilterChange({ due_date_to: e.target.value || undefined })} className={dateCls} />
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setSearchInput('');
              onFilterChange({ search: undefined, status: undefined, coach_id: undefined, programme: undefined, group: undefined, due_date_from: undefined, due_date_to: undefined });
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-close-line text-xs"></i>
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
