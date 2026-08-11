# ResumeIQ — Django + React

This project is now two separate apps that run side by side:

```
ResumeIQ_fix_5/
├── ResumeIQ/resumeIQ/        ← Django backend (unchanged, minus the 4 converted templates)
└── resumeiq-frontend/        ← React frontend (landing, AI Assistant, How it Works, Documentation)
```

They talk to each other over HTTP on two different ports. Nothing is
merged into a single build — you run both at once during development.

## 1. Run the Django backend

```bash
cd ResumeIQ/resumeIQ
python -m venv venv          # if you don't already have one
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver   # http://localhost:8000
```

`django-cors-headers` is already in `requirements.txt` and is now wired
into `resumeIQ/settings.py` (`corsheaders` app + middleware +
`CORS_ALLOWED_ORIGINS` for `http://localhost:5173`), so the React dev
server is allowed to call any Django API endpoints you build.

## 2. Run the React frontend

```bash
cd resumeiq-frontend
npm install
npm run dev                  # http://localhost:5173
```

This installs React, ReactDOM, react-router-dom, and Vite (all listed in
`package.json`) and starts the Vite dev server.

## 3. How the two are connected right now

- `LandingPage/views.py`'s four views (`home`, `ai_assistant`,
  `how_it_works`, `documentation`) each `redirect()` to the matching
  route on `REACT_APP_BASE_URL` (`http://localhost:5173` by default) —
  so visiting `http://localhost:8000/` sends you straight to the React
  app's home page, `http://localhost:8000/how-it-works/` to React's
  `/how-it-works`, etc.
- `vite.config.js` proxies any `/api/...` request made from React to
  `http://localhost:8000`, so once you add real Django API endpoints you
  can `fetch("/api/...")` from React without CORS issues in dev.
- All other Django apps (`accounts`, `recruiter`, `candidate`,
  `superadmin`) are untouched and still serve their own templates
  normally — only the `LandingPage` app's four pages were converted.

## 4. Production note

For production you'd typically either:
- `npm run build` the React app and serve the resulting `dist/` folder
  as static files (via Django's `staticfiles`, Nginx, Vercel, Netlify,
  etc.) and update `REACT_APP_BASE_URL` accordingly, or
- Keep them as fully separate deployments (e.g. React on Vercel, Django
  on Render/Railway) talking over a real API.

Either way, no code changes are needed beyond updating
`REACT_APP_BASE_URL` in `views.py` and `CORS_ALLOWED_ORIGINS` /
`ALLOWED_HOSTS` in `settings.py` to match your real domains.
