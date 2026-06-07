# C2-App-141

Repository for the team AI agent project.

The current codebase is organized for a FastAPI backend, a LangGraph agent,
an optional frontend application, project documentation, weekly reports, and
evaluation artifacts.

## Repository Structure

```text
C2-App-141/
|-- README.md                 # Project overview and setup guide
|-- JOURNAL.md                # Team learning journal and decisions
|-- WORKLOG.md                # Daily task tracking by member
|-- requirements.txt          # Python backend dependencies
|-- Dockerfile                # Backend container image
|-- docker-compose.yml        # Local Docker orchestration
|-- Makefile                  # Common backend commands
|-- .env.example              # Environment variable template
|-- .gitignore                # Git ignore rules
|
|-- src/                      # Backend source code: FastAPI + LangGraph
|   |-- main.py               # FastAPI app entrypoint
|   |-- config.py             # App settings loaded from environment
|   |-- api/                  # API routes and dependencies
|   |-- agents/               # LangGraph agent graph, state, nodes, tools, prompts
|   |-- services/             # LLM, RAG, embedding, monitoring services
|   |-- models/               # Pydantic request/response schemas
|   |-- repositories/         # Database access layer
|   `-- utils/                # Shared backend utilities
|
|-- frontend/                 # Frontend application workspace
|   |-- package.json          # Frontend package and scripts
|   |-- src/                  # Frontend source code
|   |-- public/               # Static frontend assets
|   `-- README.md             # Frontend-specific notes
|
|-- docs/                     # Technical and product documentation
|   |-- architecture.md       # System architecture overview
|   |-- architecture_diagram.md
|   |-- api_spec.md           # API contract and examples
|   |-- product_requirements.md
|   |-- deployment.md
|   `-- guide/                # Original AI20K technical guide reference
|
|-- reports/                  # Team deliverable reports
|   |-- weekly/               # Weekly reports and reusable template
|   |-- Gate-1/               # Gate 1 report assets and screenshots
|   |-- evaluation_report.md
|   `-- final/                # Final report and demo script
|
|-- data/                     # Local data folders; contents ignored by Git
|   |-- raw/                  # Original input data
|   |-- processed/            # Cleaned or transformed data
|   `-- vector_store/         # Local vector DB files
|
|-- tests/                    # Backend test suite
|   |-- test_api/
|   |-- test_agents/
|   |-- test_services/
|   `-- conftest.py
|
|-- eval/                     # Evaluation assets and outputs
|   |-- datasets/             # Evaluation datasets
|   |-- results/              # Evaluation run outputs
|   `-- metrics.py            # Metric helpers
|
|-- presentation/             # Pitch deck and video demo materials
|-- scripts/                  # Setup and AI logging scripts
|-- .github/                  # GitHub Actions workflows
|-- .ai-log/                  # Local AI usage logs; content ignored by Git
|-- .claude/ .codex/ .cursor/ .gemini/
|                             # AI tool hook configs
`-- .agents/                  # Antigravity rules and workflows
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
