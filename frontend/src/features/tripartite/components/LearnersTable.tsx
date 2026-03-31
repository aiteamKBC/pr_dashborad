import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LearnerWithStatus } from '../../../shared/types/learner';
import { formatDate } from '../../../backend/utils/review-cycle';
import Badge from '../../../shared/components/Badge';
import Card from '../../../shared/components/Card';

interface LearnersTableProps {
  learners: LearnerWithStatus[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: 'next_due_date' | 'overdue_first' | 'name';
  onSortChange: (sortBy: 'next_due_date' | 'overdue_first' | 'name') => void;
}

interface DueDatePopupProps {
  learner: LearnerWithStatus;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

function DueDatePopup({ learner, onClose, anchorRef }: DueDatePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const { cycleStatus } = learner;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  const isOverdue = cycleStatus.daysOverdue !== null && cycleStatus.daysOverdue > 0;
  const isDueSoon = cycleStatus.daysUntilDue !== null && cycleStatus.daysUntilDue <= 14 && cycleStatus.daysUntilDue > 0;

  return (
    <div
      ref={popupRef}
      className="absolute z-50 left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-fade-in"
      style={{ top: '100%' }}
    >
      {/* Arrow */}
      <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"></div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">Review Due Date</span>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
          <i className="ri-close-line text-base"></i>
        </button>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 flex items-center justify-center bg-teal-50 rounded-lg">
          <i className="ri-calendar-line text-teal-600 text-base"></i>
        </div>
        <div>
          <div className="text-xs text-gray-500">Next Review</div>
          <div className="text-sm font-semibold text-gray-900">
            {cycleStatus.nextDueDate ? formatDate(cycleStatus.nextDueDate) : '—'}
          </div>
        </div>
      </div>

      {/* Countdown */}
      {isOverdue ? (
        <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <div className="w-7 h-7 flex items-center justify-center">
            <i className="ri-alarm-warning-line text-red-500 text-lg"></i>
          </div>
          <div>
            <div className="text-xs text-red-500 font-medium">Overdue by</div>
            <div className="text-lg font-bold text-red-600">{cycleStatus.daysOverdue} days</div>
          </div>
        </div>
      ) : isDueSoon ? (
        <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 mb-3">
          <div className="w-7 h-7 flex items-center justify-center">
            <i className="ri-time-line text-amber-500 text-lg"></i>
          </div>
          <div>
            <div className="text-xs text-amber-600 font-medium">Due in</div>
            <div className="text-lg font-bold text-amber-600">{cycleStatus.daysUntilDue} days</div>
          </div>
        </div>
      ) : cycleStatus.daysUntilDue !== null ? (
        <div className="flex items-center gap-2 bg-teal-50 rounded-lg px-3 py-2 mb-3">
          <div className="w-7 h-7 flex items-center justify-center">
            <i className="ri-checkbox-circle-line text-teal-500 text-lg"></i>
          </div>
          <div>
            <div className="text-xs text-teal-600 font-medium">Days remaining</div>
            <div className="text-lg font-bold text-teal-600">{cycleStatus.daysUntilDue} days</div>
          </div>
        </div>
      ) : null}

      {/* Last review */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last Review</span>
          <span className="font-medium text-gray-700">
            {cycleStatus.lastCompletedReviewDate
              ? formatDate(cycleStatus.lastCompletedReviewDate)
              : 'No reviews yet'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LearnersTable({
  learners,
  total,
  currentPage,
  pageSize,
  onPageChange,
  sortBy,
  onSortChange,
}: LearnersTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const anchorRefs = useRef<Record<string, React.RefObject<HTMLElement>>>({});
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getOrCreateRef = (id: string) => {
    if (!anchorRefs.current[id]) {
      anchorRefs.current[id] = { current: null } as React.RefObject<HTMLElement>;
    }
    return anchorRefs.current[id];
  };

  const handleMouseEnter = (id: string) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setOpenPopupId(id);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setOpenPopupId(null);
    }, 150);
  };

  const handlePopupMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const handlePopupMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setOpenPopupId(null);
    }, 150);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return <Badge variant="error">Overdue</Badge>;
      case 'DUE_SOON':
        return <Badge variant="warning">Due soon</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'NOT_STARTED':
        return <Badge variant="default">Not started</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Sort controls */}
      <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/70 flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Sort:</span>
        {([
          { value: 'overdue_first', label: 'Overdue first' },
          { value: 'next_due_date', label: 'Next due date' },
          { value: 'name', label: 'Name' },
        ] as const).map(opt => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              sortBy === opt.value
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Learner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Programme</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Group</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Coach</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Employer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Review</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Next Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {learners.map((learner) => {
              const ref = getOrCreateRef(learner.id);
              return (
                <tr key={learner.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{learner.name}</div>
                      <div className="text-xs text-gray-500">{learner.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-700 max-w-[180px]">
                    <div className="truncate" title={learner.programme}>{learner.programme}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-700">{learner.group}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-700">{learner.coachName}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-700">{learner.employerName}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                    {learner.cycleStatus.lastCompletedReviewDate
                      ? formatDate(learner.cycleStatus.lastCompletedReviewDate)
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="relative">
                      <button
                        ref={ref as React.RefObject<HTMLButtonElement>}
                        onMouseEnter={() => handleMouseEnter(learner.id)}
                        onMouseLeave={handleMouseLeave}
                        className="text-left group cursor-pointer"
                      >
                        <div className={`text-sm font-medium underline decoration-dashed underline-offset-2 transition-colors tabular-nums whitespace-nowrap ${
                          learner.cycleStatus.daysOverdue && learner.cycleStatus.daysOverdue > 0
                            ? 'text-red-600 hover:text-red-700'
                            : learner.cycleStatus.daysUntilDue !== null && learner.cycleStatus.daysUntilDue <= 14
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-gray-700 hover:text-teal-600'
                        }`}>
                          {learner.cycleStatus.nextDueDate
                            ? formatDate(learner.cycleStatus.nextDueDate)
                            : '—'}
                        </div>
                        {learner.cycleStatus.daysUntilDue !== null && learner.cycleStatus.daysUntilDue > 0 && (
                          <div className="text-xs text-gray-400 tabular-nums">in {learner.cycleStatus.daysUntilDue}d</div>
                        )}
                        {learner.cycleStatus.daysOverdue !== null && learner.cycleStatus.daysOverdue > 0 && (
                          <div className="text-xs text-red-600 font-medium tabular-nums">{learner.cycleStatus.daysOverdue}d overdue</div>
                        )}
                      </button>

                      {openPopupId === learner.id && (
                        <div
                          onMouseEnter={handlePopupMouseEnter}
                          onMouseLeave={handlePopupMouseLeave}
                        >
                          <DueDatePopup
                            learner={learner}
                            onClose={() => setOpenPopupId(null)}
                            anchorRef={ref}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">{getStatusBadge(learner.cycleStatus.status)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/tripartite-reviews/learners/${learner.id}`}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                        title="View profile"
                      >
                        <i className="ri-eye-line text-base"></i>
                      </Link>
                      <Link
                        to={`/tripartite-reviews/reviews/new?learnerId=${learner.id}`}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                        title="Schedule review"
                      >
                        <i className="ri-calendar-schedule-line text-base"></i>
                      </Link>
                      <Link
                        to={`/tripartite-reviews/learners/${learner.id}#history`}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                        title="View history"
                      >
                        <i className="ri-history-line text-base"></i>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50/70">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 tabular-nums">
              Showing <span className="font-medium text-gray-700">{startIndex}–{endIndex}</span> of <span className="font-medium text-gray-700">{total}</span> learners
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <i className="ri-arrow-left-s-line"></i>
                Prev
              </button>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
                        currentPage === pageNum
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
                <i className="ri-arrow-right-s-line"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
