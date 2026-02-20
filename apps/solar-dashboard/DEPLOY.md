# Solar Dashboard — Deployment Guide

## Architecture
- **Backend**: FastAPI in `solar-platform/` repo, extended with mobile endpoints at `/api/v1/mobile/`
- **Frontend**: React PWA in `apps/solar-dashboard/frontend/`, served as static files  
- **Database**: DuckDB file managed by solar-platform

## Development

### Start backend
```bash
cd /path/to/solar-platform
uvicorn api.main:app --reload --port 8000
```

### Start frontend dev server
```bash
cd apps/solar-dashboard/frontend
npm run dev
# Runs on http://localhost:5173
# API calls proxied to http://localhost:8000
```

## Production Build

### Build frontend
```bash
cd apps/solar-dashboard/frontend
npm run build
# Output: dist/
```

### Deploy frontend to Cloudflare Pages (free)
1. Push this repo to GitHub/GitLab.
2. In Cloudflare Dashboard: `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git`.
3. Select this repo and set:
   - **Root directory**: `apps/solar-dashboard/frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL=https://<your-backend-domain>`
5. Deploy.

Included in this repo for Cloudflare Pages:
- `frontend/public/_redirects`: SPA fallback (`/* /index.html 200`)
- `frontend/public/_headers`: secure defaults + caching headers
- `frontend/wrangler.toml`: Pages build output config

Optional CLI deploy (after `wrangler login`):
```bash
cd apps/solar-dashboard/frontend
npm run build
npx wrangler pages deploy dist --project-name solar-dashboard
```

### Deploy frontend to GitHub Pages (free, fully automated)
This repo includes a workflow at `.github/workflows/solar-dashboard-pages.yml` that deploys the app from `apps/solar-dashboard/frontend`.

1. In GitHub repo settings, enable **Pages** and set source to **GitHub Actions**.
2. In repo **Settings -> Secrets and variables -> Actions -> Variables**, add:
   - `SOLAR_DASHBOARD_API_URL=https://<your-backend-domain>`
3. Push to `main` (or run the workflow manually from Actions).

Published URL:
`https://<github-user>.github.io/experimental-repo/`

### Serve with Caddy (recommended)
```caddy
solar.example.com {
    # Serve PWA static files
    root * /path/to/frontend/dist
    file_server

    # Proxy API calls to FastAPI
    reverse_proxy /api/* localhost:8000
    
    # SPA fallback
    try_files {path} /index.html
}
```

### Serve with nginx
```nginx
server {
    listen 443 ssl;
    server_name solar.example.com;

    root /path/to/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## iPhone Installation

1. Navigate to `https://solar.example.com` in **Safari**
2. Tap the **Share** button (box with arrow up)
3. Scroll to **"Add to Home Screen"**
4. Tap **Add**

The app installs like a native app — full screen, no Safari chrome, with offline support.

## Android Installation

1. Navigate to the URL in **Chrome**
2. Tap the **⋮ menu** → **"Add to Home Screen"** or **"Install App"**
3. Tap **Install**

## Environment Variables

Backend (`.env` in solar-platform):
```
JUGGLE_API_KEY=your_juggle_key
EMIG_API_KEY=your_emig_key
SOLAREDGE_API_KEY=your_solaredge_key
SOLIS_KEY_ID=your_solis_key_id
SOLIS_KEY_SECRET=your_solis_secret
DB_PATH=/data/solar.duckdb
```

Frontend (`.env.production` in frontend/):
```
VITE_API_URL=https://solar.example.com
```

(In development, leave blank — the vite proxy handles it)

## Service Management (systemd)

```ini
[Unit]
Description=Solar Dashboard API
After=network.target

[Service]
Type=exec
WorkingDirectory=/path/to/solar-platform
ExecStart=/path/to/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=on-failure
Environment="PYTHONPATH=/path/to/solar-platform/src"
EnvironmentFile=/path/to/solar-platform/.env

[Install]
WantedBy=multi-user.target
```
