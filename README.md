# Greppmästerskapen

This workspace contains the Vite/React frontend in `ClimbApp` and the FastAPI backend in `ClimbAPI`. The backend uses PostgreSQL and dbmate migrations.

## Prerequisites

- Node.js 20.19+ or 22.12+, with npm
- Python 3.10+
- PostgreSQL
- dbmate (on macOS, install with `brew install dbmate`)

## Start Both Applications Locally

Start PostgreSQL first and create a local database named `grepp` if it does not already exist. For a local PostgreSQL installation, `createdb grepp` is a common option; adjust the database user and connection details below to match your setup.

### 1. Configure and migrate the backend database

In `ClimbAPI`, create or update a local `.env` file with valid shell-style assignments. Do not commit this file or use production credentials locally.

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/grepp?sslmode=disable"
ASYNC_DATABASE_URL="postgresql+asyncpg://postgres:YOUR_PASSWORD@127.0.0.1:5432/grepp"
PASSWORD_PEPPER="replace-with-a-long-random-secret"
FRONTEND_URL="http://localhost:5173"
```

Create a Python virtual environment and install the backend dependencies:

```sh
cd ClimbAPI
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Load the variables into the shell and apply migrations:

```sh
set -a
source .env
set +a
dbmate up
```

Keep this terminal open for the backend so the environment variables remain loaded. Start the API:

```sh
python main.py
```

The API listens at `http://127.0.0.1:8080`; interactive API documentation is at [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs).

Mail configuration (`MAIL_USERNAME`, `MAIL_PASSWORD`, and related `MAIL_*` variables) is optional for local startup. Without mail credentials, password-reset links are printed by the backend for development.

### 2. Configure and start the frontend

Open a second terminal at the workspace root; leave the backend terminal running.

In `ClimbApp`, create `.env.local` with the backend API base URL. The URL must include `/api/v1` because frontend service paths are appended to it:

```dotenv
VITE_REACT_APP_API_URL=http://127.0.0.1:8080/api/v1
```

Install the frontend dependencies and start Vite:

```sh
cd ClimbApp
npm ci
npm run dev
```

Open the URL Vite prints, normally [http://localhost:5173](http://localhost:5173). The backend CORS configuration allows this default frontend origin. If Vite selects another port, add that frontend origin to `allow_origins` in `ClimbAPI/main.py`.

Restart Vite after creating or changing `.env.local`; Vite reads environment files at startup. Both `.env` files are local configuration and must not contain committed secrets.

## Tests

Backend tests (install `requirements-dev.txt` in the active virtual environment first):

```sh
cd ClimbAPI
python -m pip install -r requirements-dev.txt
pytest -q
```

Frontend tests:

```sh
cd ClimbApp
npm run test:run
```

For backend-specific setup details, see [ClimbAPI/README.md](../ClimbAPI/README.md).
