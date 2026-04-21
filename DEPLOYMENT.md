# Production Deployment

This project matches the server layout shown in production:

- Backend root: `/var/www/pr_dashboard/backend`
- Frontend root: `/var/www/pr_dashboard/frontend`
- OpenLiteSpeed document root: `/var/www/pr_dashboard/frontend/dist`
- OpenLiteSpeed proxy context: `/api/`
- Gunicorn upstream: `127.0.0.1:8010`
- Public domain: `pr.kentbusinesscollege.net`

## 1. Push code to GitHub

Run these commands from your local machine after reviewing the changes:

```bash
git status
git add .
git commit -m "Add production deployment config"
git push origin main
```

## 2. Prepare the server

```bash
cd /var/www/pr_dashboard
git pull origin main
```

### Backend

```bash
cd /var/www/pr_dashboard/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py check
```

Update `backend/.env` with the real production values before starting Gunicorn.

Recommended values:

```env
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=pr.kentbusinesscollege.net
DJANGO_CORS_ALLOWED_ORIGINS=https://pr.kentbusinesscollege.net
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

### Frontend

Create `frontend/.env.production`:

```env
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK=false
```

Then build:

```bash
cd /var/www/pr_dashboard/frontend
npm install
npm run build
```

This writes the production files to `/var/www/pr_dashboard/frontend/dist`, which matches the OpenLiteSpeed document root in your screenshots.

## 3. Run Gunicorn

Temporary manual run:

```bash
cd /var/www/pr_dashboard/backend
source .venv/bin/activate
gunicorn -c gunicorn.conf.py
```

Systemd service setup:

```bash
sudo cp /var/www/pr_dashboard/deploy/pr_dashboard-gunicorn.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pr_dashboard-gunicorn
sudo systemctl start pr_dashboard-gunicorn
sudo systemctl status pr_dashboard-gunicorn
```

## 4. OpenLiteSpeed mapping

Use the same production setup already shown in your screenshots:

- Virtual host root: `/var/www/pr_dashboard/backend`
- Document root: `/var/www/pr_dashboard/frontend/dist`
- Static context: `/`
- Proxy context: `/api/`
- External app address: `127.0.0.1:8010`

If the proxy context forwards `/api/` to Gunicorn, Django will receive routes like `/api/v1/...` correctly.

## 5. Update workflow

Whenever you change the code:

```bash
cd /var/www/pr_dashboard
git pull origin main
cd frontend && npm run build
cd ../backend
source .venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart pr_dashboard-gunicorn
```
