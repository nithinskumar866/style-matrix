# Style Matrix

An AI wardrobe app. Upload photos of your clothes, and it classifies them and suggests outfits from a text prompt.

- **Frontend:** React, TypeScript, Vite, Supabase client
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL with pgvector
- **AI:** ResNet50 category classifier, FashionCLIP embeddings, outfit compatibility model

## Prerequisites

- Python 3.11 or 3.12
- Node.js 22
- Git and [Git LFS](https://git-lfs.com)
- PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension (Supabase includes it)
- A Supabase project with:
  - Email login enabled
  - Asymmetric (ES256) JWT signing keys, because the backend verifies tokens through JWKS
  - A public storage bucket for clothing photos, plus a public bucket named `profiles` for avatars

## Setup

Get the model files, which are stored in Git LFS:

```bash
git lfs install
git lfs pull
```

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scriptsctivate    macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in your values
alembic upgrade head
uvicorn app.main:app --port 8000
```

The first start downloads the FashionCLIP model from Hugging Face, which can take a few minutes.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env   # then fill in your values
npm run dev
```

Open http://localhost:5173. The backend only accepts requests from port 5173 by default.

## Tests

The backend tests stub out the AI models, but they need a PostgreSQL database with pgvector. They empty its tables, so use a throwaway database and never your real one:

```bash
cd backend
pip install -r requirements-test.txt
export DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/THROWAWAY_DATABASE
alembic upgrade head
python -m pytest tests
```

For the frontend, run `npm run lint` and `npm run build`. CI runs all of these on every pull request.
