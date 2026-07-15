# Email Converter SaaS

Convert email archives (MBOX, PST, EML) between formats, back them up, and manage
everything through a REST API with a companion web frontend.

## Stack

- **API**: FastAPI (async), SQLAlchemy 2.0 (async), PostgreSQL, Redis, Celery
- **Frontend**: React + Vite + TypeScript (see `frontend/`)
- **Infra**: Docker Compose for local dev, Kubernetes manifests/Helm chart for
  production, Terraform for cloud infrastructure

## Getting Started

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- Node.js 20+ (for the frontend, see `frontend/README.md` if present)

### Local development

```bash
cp .env.example .env.dev
pip install -e ".[dev]"
alembic upgrade head
uvicorn src.main:app --reload
```

Note: this requires PostgreSQL and Redis running locally (or reachable via
`DATABASE_URL`/`REDIS_URL` in `.env.dev`).

### Running tests

```bash
pytest
```

### Linting and type-checking

```bash
ruff check .
mypy src
```

## Project Layout

```
src/
  api/          # FastAPI route handlers
  core/         # config, security, dependency wiring
  db/           # database session/engine setup
  middleware/   # request middleware
  models/       # SQLAlchemy ORM models
  modules/      # domain modules (conversion, backup, billing, etc.)
  repositories/ # data-access layer
  schemas/      # Pydantic request/response schemas
  services/     # business logic
frontend/       # React/Vite web client
k8s/            # Kubernetes manifests, kustomize overlays, Helm chart
infrastructure/ # Terraform
docs/           # architecture, deployment, and operations docs
```

See `docs/ARCHITECTURE.md` for a deeper dive and `docs/DEPLOYMENT_GUIDE.md` for
production deployment instructions.

## License

MIT
