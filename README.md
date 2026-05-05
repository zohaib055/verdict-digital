# Verdict Backend

Verdict is a play-money political prediction market prototype. The app includes a FastAPI backend, PostgreSQL schema managed by Alembic, and a Vite/React frontend.

## Scope

- Play money only
- No wallets, crypto, KYC, or on-chain requirements
- Manual admin governance for market creation, approval, pause/resume, and resolution
- Bayesian-smoothed displayed probabilities
- Public market pages, profiles, leaderboards, and share links
- Political intelligence ingestion for internal market suggestions

## Backend Setup

Create and activate the Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Create a root `.env` file:

```bash
cp .env.example .env
```

At minimum, set:

```bash
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
AUTH_SECRET_KEY=change-this
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Database

Check migration status:

```bash
alembic current
alembic heads
```

Apply migrations:

```bash
alembic upgrade head
```

Check that current ORM metadata matches the live database:

```bash
alembic check
```

## Frontend Setup

Install dependencies:

```bash
cd frontend
npm install
```

Create frontend env:

```bash
cp .env.example .env
```

Run the frontend:

```bash
npm run dev
```

Build and test:

```bash
npm run build
npm test -- --passWithNoTests
```

## Useful URLs

- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:5173`

If port `5173` is busy, Vite will choose the next available port.

## Ubuntu Deployment

Systemd and Nginx deployment templates are in `deploy/`.

- Backend service template: `deploy/verdict-backend.service`
- Optional Nginx reverse proxy: `deploy/nginx-verdict-backend.conf`
- Step-by-step server guide: `deploy/README-ubuntu.md`

The production service is configured to run the backend on port `8001`.

## Notes

- Root `.env` and `project.txt` are intentionally ignored.
- The live database should be kept at Alembic head.
- Share artifacts currently exist as backend-generated share payloads/links; rendered social image cards are a future implementation pass.
