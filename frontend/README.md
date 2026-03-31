# Tripartite Reviews Management System

A comprehensive React application for managing tripartite reviews in apprenticeship programmes. Built with Vite, React 19, TypeScript, Tailwind CSS, and modern development tools.

## Features

- **Dashboard Overview**: KPI cards, analytics charts, and comprehensive filtering
- **Review Management**: Create, view, edit, and track tripartite reviews
- **Compliance Tracking**: 13 criteria evaluation with automated scoring
- **Risk Management**: Automated risk flag detection and monitoring
- **SMART Actions**: Create and track actions for learners, employers, and coaches
- **Sign-off Workflow**: Digital sign-off tracking for all parties
- **Analytics**: Criteria pass rates, compliance trends, and coach performance
- **CSV Export**: Export filtered review data
- **Mock Mode**: Fully functional with 45+ realistic mock reviews

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router DOM** for routing
- **TanStack React Query** for data fetching
- **React Hook Form** + Zod for form validation
- **Recharts** for data visualisation
- **Axios** for API calls
- **date-fns** for date manipulation

## Getting Started

### Installation

\`\`\`bash
npm install
\`\`\`

### Development

Run in mock mode (no backend required):

\`\`\`bash
npm run dev
\`\`\`

The application will start at `http://localhost:3000`

## Django Backend (Neon)

Backend files are in `backend/`.

### 1) Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2) Configure backend environment

Create `backend/.env` (or copy from `backend/.env.example`) with:

```env
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://...
```

### 3) Run backend

```bash
cd backend
python manage.py runserver 127.0.0.1:8000
```

### Implemented API endpoints

- `GET /api/v1/health`
- `GET /api/v1/dashboard/booking-summaries?limit=20`
- `GET /api/v1/dashboard/kpis`
- `GET /api/v1/dashboard/due-soon`
- `GET /api/v1/dashboard/overdue`
- `GET /api/v1/dashboard/recent-reviews`
- `GET /api/v1/dashboard/status-counts`
- `GET /api/v1/dashboard/weekly-trend`

### Environment Variables

Create a `.env` file:

\`\`\`
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK=true
\`\`\`

For production with real backend:

\`\`\`
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
VITE_USE_MOCK=false
\`\`\`

### Build

\`\`\`bash
npm run build
\`\`\`

### Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Project Structure

\`\`\`
src/
├── features/
│   └── tripartite/
│       ├── api/              # API integration
│       ├── components/       # Feature components
│       └── pages/            # Page components
├── shared/
│   ├── components/           # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and mock API
│   ├── types/                # TypeScript types
│   └── utils/                # Helper functions
├── router/                   # Routing configuration
├── App.tsx                   # Root component
└── main.tsx                  # Entry point
\`\`\`

## Routes

- `/tripartite-reviews` - Dashboard with list and analytics
- `/tripartite-reviews/new` - Create new review
- `/tripartite-reviews/:id` - View review details
- `/tripartite-reviews/:id/edit` - Edit review

## API Contracts

### Reviews
- `GET /api/v1/reviews` - List reviews with filtering
- `GET /api/v1/reviews/:id` - Get review details
- `POST /api/v1/reviews` - Create review
- `PATCH /api/v1/reviews/:id` - Update review
- `PUT /api/v1/reviews/:id/evaluations` - Update evaluations

### Actions
- `GET /api/v1/reviews/:id/actions` - Get actions
- `POST /api/v1/reviews/:id/actions` - Create action
- `PATCH /api/v1/actions/:actionId` - Update action
- `DELETE /api/v1/actions/:actionId` - Delete action

### Sign-off
- `POST /api/v1/reviews/:id/signoff` - Update sign-off status

### Analytics
- `GET /api/v1/analytics/summary` - Summary statistics
- `GET /api/v1/analytics/criteria-pass-rate` - Criteria performance
- `GET /api/v1/analytics/trend` - Compliance trends
- `GET /api/v1/analytics/by-coach` - Coach analytics

## Compliance Criteria

1. Review within required timeframe
2. Duration (expected 1 hour)
3. Attendance (learner, employer, skill coach)
4. Progress vs Apprenticeship Standard, KSBs
5. Off the job training hours reviewed and recorded
6. Learner explains learning and application at work
7. Employer feedback on workplace performance
8. Safeguarding and wellbeing check
9. Support needs or risks identified and addressed
10. SMART actions set for learner, employer, coach
11. Actions linked to progress gaps or next assessment steps
12. Notes clear, specific, non generic
13. Review confirmed, signed off by all parties

## Mock Data

The application includes 45+ realistic mock reviews with:
- Varied programmes and cohorts
- Multiple learners, employers, and coaches
- Realistic evaluation data
- SMART actions with different statuses
- Sign-off tracking
- Risk scenarios

## Licence

Private - All rights reserved
