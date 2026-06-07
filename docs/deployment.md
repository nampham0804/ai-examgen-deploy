# Deployment

## Recommended Setup

| Layer | Free Option | Upgrade Option |
| --- | --- | --- |
| Frontend | Vercel | VPS + Nginx |
| Backend | Render or Railway | VPS + Docker |
| Database | Supabase PostgreSQL | Managed PostgreSQL |
| Vector DB | ChromaDB local or Pinecone free | Weaviate self-host |
| Monitoring | Sentry free | Datadog or New Relic |

## Backend

Run locally:

```bash
uvicorn src.main:app --reload --port 8000
```

## Docker

```bash
docker compose up --build
```

