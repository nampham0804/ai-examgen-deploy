# C2-App-141

Repository for the team AI agent project.

The current codebase is organized for a FastAPI backend, a LangGraph agent,
an optional frontend application, project documentation, weekly reports, and
evaluation artifacts.

## Repository Structure

```text
C2-App-141/
├── src/                  # Backend source code: FastAPI + LangGraph
├── frontend/             # Frontend application
├── docs/                 # Technical and product documentation
├── reports/              # Weekly, evaluation, and final reports
├── data/                 # Local data folders, ignored except .gitkeep
├── tests/                # Backend test suite
├── eval/                 # Evaluation datasets, metrics, and results
├── presentation/         # Pitch deck and video demo materials
├── scripts/              # Setup and AI logging scripts
└── .github/              # GitHub Actions workflows
```

## Backend

The backend lives in `src/`.

Important folders:

- `src/api/`: FastAPI routes and dependencies
- `src/agents/`: LangGraph graph, state, nodes, tools, and prompts
- `src/services/`: LLM, RAG, embedding, and monitoring services
- `src/models/`: Pydantic schemas
- `src/repositories/`: database access layer
- `src/utils/`: shared utility helpers

Run locally:

```bash
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Open API docs:

```text
http://localhost:8000/docs
```

## Frontend

Frontend code should be placed in `frontend/`.

This keeps Node.js dependencies, UI source code, and frontend deployment separate
from the Python backend.

## Reports

Weekly reports are stored in:

```text
reports/weekly/
```

Use `reports/weekly/template.md` when creating a new weekly report.

Final deliverables are stored in:

```text
reports/final/
presentation/
eval/
```

## Documentation

Core project documentation:

- `docs/product_requirements.md`
- `docs/architecture.md`
- `docs/api_spec.md`
- `docs/deployment.md`

The original technical guide remains in `docs/guide/` for reference.

## Tests

Run backend tests:

```bash
pytest tests/ -v
```

## Environment

Copy `.env.example` to `.env` and fill in required values such as API keys,
database connection strings, and deployment settings.

