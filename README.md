# TuneVexa

Live Spotify Global Top 200 chart tracker.

## Stack
- **Frontend**: React + Vite
- **Backend**: FastAPI + Python
- **Database**: Supabase (PostgreSQL)
- **Data source**: kworb.net + iTunes Search API (cover art)

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your Supabase credentials
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
npm install
npm run dev
```

## Environment Variables
See `backend/.env.example` for required variables.
