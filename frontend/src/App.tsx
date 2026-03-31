import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './router';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { LoadingSpinner } from './shared/components/LoadingSpinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={__BASE_PATH__}>
        <ErrorBoundary
          fallbackTitle="The app hit a render error"
          fallbackMessage="The page loaded, but a runtime error stopped it from rendering. The error details are shown below."
        >
          <Suspense fallback={<LoadingSpinner size="lg" />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
