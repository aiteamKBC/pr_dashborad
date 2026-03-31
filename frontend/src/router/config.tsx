
import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

const NotFound = lazy(() => import('../pages/NotFound'));
const ProgressReviewPage = lazy(() => import('../pages/progress-review/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <ProgressReviewPage />,
  },
  {
    path: '/checklist-matrix',
    element: <ProgressReviewPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
