# Database Migration Guide

This project uses Alembic to manage database schema changes.

Backend startup no longer creates or updates database tables automatically. The database schema must be prepared with Alembic before running the FastAPI app.

## Local Setup

1. Create a PostgreSQL database.

Recommended local database name:

```sql
CREATE DATABASE ai_examgen_alembic;
```

2. Set `DATABASE_URL` in `.env`.

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_examgen_alembic
```

If your password contains `@`, encode it as `%40`.

Example:

```env
DATABASE_URL=postgresql://postgres:123456a%40@localhost:5432/ai_examgen_alembic
```

3. Run migrations from the project root.

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

On macOS/Linux:

```bash
python -m alembic upgrade head
```

4. Start the backend.

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

## Development Workflow

After pulling code that contains new migrations, run:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Then start the backend.

## Creating A New Migration

When a SQLAlchemy model changes, create a migration:

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe schema change"
```

Review the generated migration file under:

```text
alembic/versions/
```

Then apply it:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

## Deploy Workflow

Deployment should run in this order:

```text
1. Provision PostgreSQL database
2. Set DATABASE_URL and other environment variables
3. Run alembic upgrade head
4. Start FastAPI backend
5. Deploy frontend
```

End users do not run migrations. Migrations are a deploy/developer step.

## Seed Data

`src.repositories.database.init_db()` seeds the demo user with `id=1` after migrations have created the tables.

It does not create tables.

This keeps compatibility with MVP flows that still use default values such as:

```text
owner_id=1
created_by=1
approved_by=1
```

## Automated Tests

Automated API tests still create a temporary SQLite schema in `tests/conftest.py` with `Base.metadata.create_all()`.

This is intentional:

```text
Production/deploy schema: Alembic
Temporary test schema: SQLAlchemy metadata
```

Do not add `Base.metadata.create_all()` back into production startup.
