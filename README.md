# Style Matrix

**An AI wardrobe assistant.** Photograph your clothes, and Style Matrix sorts them into categories, tracks what is in the wash, and suggests outfits from a plain-text prompt such as *"casual weekend"*.

![Style Matrix outfit suggestions](docs/images/outfit-ideas.png)

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [How it works](#how-it-works)
- [AI models](#ai-models)
- [Database](#database)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Deployment](#deployment)
- [Training the models](#training-the-models)
- [Known limitations](#known-limitations)
- [Contributors](#contributors)

## Features

| Feature | What it does |
|---|---|
| **Digital wardrobe** | Upload photos in batches, by click or drag and drop. |
| **Automatic categories** | A ResNet50 classifier sorts each item into one of 50 clothing categories. |
| **Outfit suggestions** | Describe an occasion or style, and get ranked outfits made from your own clothes. |
| **Style compatibility** | A trained model scores how well a top and a bottom go together. |
| **Laundry tracking** | "Wear Today" moves items to *In the Wash* and leaves them out of suggestions for 5 days. |
| **Accounts and profiles** | Email login and profile settings through Supabase. |

## Screenshots

The screenshots use simple drawn sample images, not real clothing photos.

### Sign in

![Sign in page](docs/images/login.png)

### Wardrobe

Items appear with their predicted category. The dropdown switches between *Available* and *In the Wash*.

![Wardrobe page](docs/images/wardrobe.png)

### Upload

![Upload page](docs/images/upload.png)

### Profile settings

![Profile settings page](docs/images/settings.png)

## Architecture

Style Matrix has three main parts: a React frontend, a FastAPI backend that runs the AI models, and Supabase, which provides login, photo storage and a PostgreSQL database with pgvector.

```mermaid
flowchart LR
    User([User]) --> FE

    subgraph Frontend["Frontend: React + Vite"]
        FE[Pages<br/>Wardrobe, Upload,<br/>Outfit Ideas, Settings]
    end

    subgraph Backend["Backend: FastAPI"]
        API[REST API]
        Auth[Token check<br/>using JWKS]
        Rules[Outfit rules<br/>and scoring]
        subgraph Models["AI models, loaded at startup"]
            ResNet[ResNet50<br/>category classifier]
            CLIP[FashionCLIP<br/>image and text embeddings]
            Compat[Compatibility model<br/>top + bottom score]
        end
        API --> Auth
        API --> Rules
        API --> ResNet
        API --> CLIP
        Rules --> Compat
    end

    subgraph Supabase["Supabase"]
        SAuth[Auth]
        Storage[Storage<br/>clothing photos]
        DB[(PostgreSQL<br/>with pgvector)]
    end

    FE -- "login" --> SAuth
    FE -- "upload photos" --> Storage
    FE -- "REST + login token" --> API
    Auth -- "signing keys" --> SAuth
    API -- "download photos" --> Storage
    API -- "items and embeddings" --> DB
```

### Technology

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, shadcn/ui |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL with pgvector |
| **Login and storage** | Supabase Auth and Storage |
| **AI** | PyTorch, torchvision, Hugging Face Transformers |
| **Delivery** | Docker, GitHub Actions, Hugging Face Spaces |

## How it works

### Adding clothes

The browser uploads photos directly to Supabase Storage, then sends their URLs to the backend. The backend only accepts URLs from the project's own public storage. If some images in a batch can't be read, the rest are still saved.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant S as Supabase Storage
    participant API as FastAPI
    participant AI as ResNet50 + FashionCLIP
    participant DB as PostgreSQL

    User->>FE: Choose photos
    FE->>S: Upload each photo
    S-->>FE: Public URLs
    FE->>API: POST /api/wardrobe/add-clothing
    API->>API: Check the login token and URLs
    API->>S: Download each photo
    API->>AI: Classify and embed
    AI-->>API: Category and 512-number embedding
    API->>DB: Save the items
    API-->>FE: Number added and failed
    FE-->>User: Show the result
```

### Getting outfit suggestions

```mermaid
flowchart TD
    A[Text prompt] --> B[FashionCLIP turns the<br/>prompt into an embedding]
    B --> C{Asks for a dress,<br/>jumpsuit or similar?}
    C -- Yes --> D[Search full-body items]
    C -- No --> E[Search tops and bottoms]
    D --> F[Leave out items worn in the last 5 days<br/>Keep the 5 closest matches per slot]
    E --> F
    F --> G{Outfit type}
    G -- Top + bottom --> H[60% compatibility model<br/>40% prompt match]
    G -- Full body --> I[Prompt match]
    H --> J[Return the 5 best outfits]
    I --> J
```

Prompt match is the cosine similarity between the prompt and the item, scaled so that 0.4 or above counts as a full match. For a top and bottom pair, the two items' prompt matches are averaged.

### Wear tracking

"Wear Today" records today's date on each item. For the next 5 days, the item appears under *In the Wash* and isn't suggested. After that it returns to *Available* automatically.

## AI models

| Model | Job | Trained on | Output | File |
|---|---|---|---|---|
| **ResNet50** | Classify a clothing photo | DeepFashion | 1 of 50 categories | `backend/app/ai/fashion_resnet50.pth` |
| **FashionCLIP** | Embed images and text in the same space | Pretrained: [`patrickjohncyh/fashion-clip`](https://huggingface.co/patrickjohncyh/fashion-clip) | 512 numbers | Downloaded on first start |
| **Compatibility model** | Score how well two items go together | Polyvore outfits | Score from 0 to 1 | `backend/data/polyvore/compatibility_model.pth` |

### Categories

| Slot | Class IDs | Examples |
|---|---|---|
| **Top** | 0–19 | Blazer, Hoodie, Sweater, Tee |
| **Bottom** | 20–35 | Chinos, Jeans, Shorts, Skirt |
| **Full body** | 36–49 | Coat, Dress, Jumpsuit, Romper |

### Compatibility model design

It's a small neural network that joins the embeddings of two items and predicts whether they belong in the same outfit.

```mermaid
flowchart LR
    A[Item 1<br/>512 numbers] --> C[Join<br/>1024]
    B[Item 2<br/>512 numbers] --> C
    C --> D[Dense 512<br/>ReLU]
    D --> E[Dense 128<br/>ReLU]
    E --> F[Dense 1<br/>Sigmoid]
    F --> G[Score<br/>0 to 1]
```

## Database

```mermaid
erDiagram
    USERS ||--o{ CLOTHING_ITEMS : owns
    USERS ||--o{ FEEDBACK : gives

    USERS {
        int id PK
        string user_id UK "Supabase user ID"
    }
    CLOTHING_ITEMS {
        int id PK
        int user_id FK
        string name
        string image_url
        string category "Class ID 0-49"
        vector embedding "512 numbers"
        datetime last_worn_date
        float score
    }
    FEEDBACK {
        int id PK
        int user_id FK
        json items
        string interaction_type
        float reward
        string weather
        string occasion
        string time_of_day
        float predicted_score
        datetime created_at
    }
```

The `feedback` table is reserved for learning from user feedback, which isn't built yet.

## API reference

Every endpoint needs a Supabase login token in the `Authorization: Bearer <token>` header. Interactive docs are at `/docs` while the backend is running.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/wardrobe/items?count=10` | List your clothes, newest first |
| `POST` | `/api/wardrobe/add-clothing` | Add clothes from storage URLs |
| `POST` | `/api/wardrobe/wear-today` | Mark your items as worn today |
| `GET` | `/api/recommendation/recommend?prompt=...` | Get outfit suggestions |
| `POST` | `/api/user-profile` | Get the profile placeholder |
| `POST` | `/api/feedback/` | Placeholder that doesn't save yet |

**Example: add clothing**

`POST /api/wardrobe/add-clothing`

```json
{ "imageUrls": ["https://YOUR-PROJECT.supabase.co/storage/v1/object/public/YOUR-BUCKET/shirt.png"] }
```

Response:

```json
{ "response": "Images created", "added": 1, "failed": 0, "status_code": 201 }
```

**Example: get suggestions**

`GET /api/recommendation/recommend?prompt=casual%20weekend`

```json
{
  "recommendations": [
    {
      "score": 0.47,
      "outfit": {
        "top": { "id": 5, "url": "https://..." },
        "bottom": { "id": 6, "url": "https://..." }
      }
    }
  ],
  "status_code": 200
}
```

## Project structure

```text
style-matrix/
├── .github/workflows/
│   ├── ci.yml                     Tests, lint and build on each pull request
│   └── sync_to_hf.yml             Syncs main to Hugging Face Spaces
├── backend/
│   ├── alembic/                   Database migrations
│   ├── app/
│   │   ├── ai/                    Classifier model and training code
│   │   │   └── recommendation/    Compatibility model and training code
│   │   ├── routes/                API endpoints
│   │   ├── schemas/               Request and response shapes
│   │   ├── crud.py                Database helpers
│   │   ├── database.py            Database connection
│   │   ├── main.py                FastAPI app and CORS
│   │   ├── models.py              Database tables
│   │   ├── outfit_rules.py        Outfit slots and prompt routing
│   │   ├── services.py            Login check and outfit scoring
│   │   └── util.py                Classification and embeddings
│   ├── data/polyvore/             Outfit data and model files
│   └── tests/                     Backend tests
├── docs/images/                   README screenshots
├── frontend/
│   ├── helper.ts                  Upload helper
│   └── src/
│       ├── components/            Pages and UI components
│       ├── context/               Login state
│       └── lib/                   Supabase client and category names
└── Dockerfile                     Backend image for deployment
```

## Getting started

### Prerequisites

- Python 3.11 or 3.12
- Node.js 22
- Git and [Git LFS](https://git-lfs.com)
- A [Supabase](https://supabase.com) project with:
  - Email login enabled
  - Asymmetric (ES256) JWT signing keys, because the backend verifies tokens through JWKS
  - A public storage bucket for clothing photos
  - A public storage bucket named `profiles` for avatars
  - The `vector` extension available, which Supabase includes

### 1. Get the code and model files

```bash
git clone https://github.com/MohamedAazil/style-matrix.git
cd style-matrix
git lfs install
git lfs pull
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
```

Activate the environment:

```bash
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS and Linux
```

Then install, configure and run it:

```bash
pip install -r requirements.txt
cp .env.example .env         # then fill in your values
alembic upgrade head
uvicorn app.main:app --port 8000
```

The first start downloads FashionCLIP from Hugging Face, which can take a few minutes.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm ci
cp .env.example .env         # then fill in your values
npm run dev
```

Open http://localhost:5173.

### Environment variables

**`backend/.env`**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Database address. It must start with `postgresql+psycopg://`. |
| `SUPABASE_URL` | Your Supabase project URL. |
| `ALLOWED_ORIGINS` | Comma-separated frontend addresses allowed to call the API. Defaults to port 5173 on localhost. |

**`frontend/.env`**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL. It must match the backend's `SUPABASE_URL`. |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key. |
| `VITE_BACKEND_URL` | Backend address, such as `http://127.0.0.1:8000`. |
| `VITE_IMAGE_BUCKET_NAME` | Public storage bucket for clothing photos. |

## Testing

The backend tests replace the AI models with stand-ins, so they run quickly without PyTorch. They do need a PostgreSQL database with pgvector, and **they empty its tables, so only use a throwaway database.**

```bash
cd backend
pip install -r requirements-test.txt
export DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/THROWAWAY_DATABASE
alembic upgrade head
python -m pytest tests
```

For the frontend:

```bash
cd frontend
npm run lint
npm run build
```

CI runs all of these on every pull request, and also checks that the migrations match the database models.

## Deployment

The backend deploys to [Hugging Face Spaces](https://huggingface.co/spaces) as a Docker container on port 7860. Each push to `main` syncs to the Space through `.github/workflows/sync_to_hf.yml`, which needs these repository settings:

| Setting | Type | Description |
|---|---|---|
| `HF_TOKEN` | Secret | Hugging Face access token |
| `HF_USERNAME` | Variable | Hugging Face username |
| `HF_SPACE_NAME` | Variable | Name of the Space |

Set the backend environment variables on the Space, including `ALLOWED_ORIGINS` with the address of the live frontend.

## Training the models

Pretrained model files come with the repository, so you only need this to retrain them. The training images aren't included, so download these first:

- **Classifier:** [DeepFashion](https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html) images and label files, placed in `backend/data/`
- **Compatibility model:** Polyvore images and `category_id.txt`, placed in `backend/data/polyvore/`

**Train the classifier:**

```bash
cd backend/app/ai
python train.py
python evaluate.py
```

**Train the compatibility model.** Run these in order, from the folders shown:

```bash
cd backend/app/ai/recommendation
python preprocess_items.py             # Build items.csv

cd ..
python generate_clip_embeddings.py     # Embed each item

cd recommendation
python generate_candidates.py          # Build matching and random pairs
python train_compatibility_model.py    # Train and save the model
```

## Known limitations

- **Recommendation accuracy:** given an outfit and 4 same-category options, the current compatibility model picks the right item about 58% of the time, against 25% by chance. That's probably optimistic, because `preprocess_items.py` mixes the train, validation and test outfits, and only about 23% of Polyvore items were embedded. A clean retrain is the biggest available improvement.
- **Tuning:** the 60/40 scoring split and the 0.4 similarity cap are starting values and need testing with real wardrobes.
- **Outfit slots:** suggestions only cover top + bottom or full-body items. Shoes, outerwear layering and accessories aren't handled.
- **Full-body items:** they're only suggested when the prompt names one, such as "dress".
- **Failed uploads:** photos that can't be processed stay in storage.
- **Mobile:** the layout is designed for desktop screens.
- **Not built yet:** saving feedback, Google login, and password reset.

## Contributors

- [Mohamed Aazil](https://github.com/MohamedAazil)
- [Nithin](https://github.com/nithinskumar866)
- [Akash R J](https://github.com/AKASH-RJ)
