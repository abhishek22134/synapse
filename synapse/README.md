# Synapse — Enterprise AI Knowledge Platform (v1)

> Version 1 does exactly 3 things:
> 1. Connect Google Drive
> 2. Connect Slack
> 3. Answer questions using AI

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) |
| Backend | Python + FastAPI |
| AI | OpenAI API (embeddings + GPT-4o) |
| Vector DB | Pinecone |
| Auth | NextAuth.js |

## Project Structure

```
synapse/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages & API routes
│       ├── components/
│       └── lib/
└── backend/           # FastAPI server
    ├── routers/       # Route handlers
    ├── services/      # Business logic
    └── core/          # Config & shared utilities
```

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your API keys
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # Fill in your keys
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Backend `.env`
```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=synapse
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
```

### Frontend `.env.local`
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Data Flow

```
Google Drive + Slack
        ↓
  Fetch documents
        ↓
  Chunk text (512 tokens, 50 overlap)
        ↓
  OpenAI text-embedding-3-small
        ↓
  Store vectors in Pinecone
        ↓
  User asks a question
        ↓
  Embed the question
        ↓
  Search Pinecone (top 5 chunks)
        ↓
  GPT-4o generates answer with citations
        ↓
  Return answer + source links
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/connect/google` | Store Google OAuth token & start indexing |
| POST | `/connect/slack` | Store Slack OAuth token & start indexing |
| GET | `/connect/status` | Get indexing status for all sources |
| POST | `/ask` | Ask a question, get AI answer |
| GET | `/health` | Health check |
