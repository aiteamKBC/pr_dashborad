import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getLearners } from '../api/learners-api';
import { LearnerListParams } from '../../../shared/types/learner';
import LearnersTable from '../components/LearnersTable';
import LearnersFilterBar from '../components/LearnersFilterBar';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Card from '../../../shared/components/Card';

export default function LearnersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract filter params from URL
  const filters: LearnerListParams = {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') as any || undefined,
    coach_id: searchParams.get('coach_id') || undefined,
    programme: searchParams.get('programme') || undefined,
    group: searchParams.get('group') || undefined,
    due_date_from: searchParams.get('due_date_from') || undefined,
    due_date_to: searchParams.get('due_date_to') || undefined,
    sort_by: (searchParams.get('sort_by') as any) || 'next_due_date',
    page: parseInt(searchParams.get('page') || '1'),
    page_size: 20,
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['learners', filters],
    queryFn: () => getLearners(filters),
  });

  const handleFilterChange = (newFilters: Partial<LearnerListParams>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    if (!newFilters.page) {
      params.set('page', '1');
    }
    
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  if (isError) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <i className="ri-error-warning-line text-5xl text-red-500"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load learners</h3>
          <p className="text-sm text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Learners</h1>
        <p className="text-sm text-gray-600">
          Manage learner profiles and track review schedules
        </p>
      </div>

      <LearnersFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        totalCount={data?.total || 0}
      />

      {isLoading ? (
        <Card className="p-12">
          <LoadingSpinner size="lg" />
          <p className="text-center text-sm text-gray-600 mt-4">Loading learners...</p>
        </Card>
      ) : data && data.items.length > 0 ? (
        <LearnersTable
          learners={data.items}
          total={data.total}
          currentPage={filters.page || 1}
          pageSize={filters.page_size || 20}
          onPageChange={handlePageChange}
          sortBy={filters.sort_by || 'next_due_date'}
          onSortChange={(sort_by) => handleFilterChange({ sort_by })}
        />
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <i className="ri-user-search-line text-5xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No learners found</h3>
          <p className="text-sm text-gray-600 mb-6">
            {filters.search || filters.status || filters.coach_id || filters.programme || filters.group
              ? 'Try adjusting your filters to see more results'
              : 'No learners have been added to the system yet'}
          </p>
          {(filters.search || filters.status || filters.coach_id || filters.programme || filters.group) && (
            <button
              onClick={() => setSearchParams({})}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
