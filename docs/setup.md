# MedGemma FHIR-Bridge Setup Guide

This project is containerized for easy deployment and development using **Docker Compose**. This is the recommended way to run the application.

## 🚀 Quick Start (Docker Compose)

The easiest way to get the entire stack (Frontend + Backend + Database) running.

### 1. Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- Git

### 2. Configure Environment

Create your environment file from the example:

```bash
cp .env.example .env
```

**Important:** Open `.env` and set your `medGemma_api_key` and vLLM endpoint configuration.

### 3. Launch the Stack

Run the following command in the project root:

```bash
docker compose up --build
```

This will spin up:

- **Database:** PostgreSQL 15 (Port 5432)
- **Backend:** FastAPI with Hot-Reload (Port 8000)
- **Frontend:** React/Vite (Port 3000)

### 4. Access the Application

- **Frontend UI:** [http://localhost:3000](http://localhost:3000)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Advanced: Local Development (Non-Docker)

If you prefer to run services locally on your machine (e.g. for debugging specific Python logic), we use [uv](https://github.com/astral-sh/uv) for fast dependency management.

### 1. Install uv

**Windows (PowerShell):**

```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Linux / macOS:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Install Python Dependencies

Navigate to the project root and sync dependencies:

```bash
uv sync
```

_This creates a `.venv` with all required packages locked._

### 3. Run the Database

You still need a database. You can run just the DB via Docker:

```bash
docker compose up -d db
```

### 4. Run the Backend

Start the FastAPI server locally:

```bash
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Run the Frontend

Open a new terminal for the frontend:

```bash
cd frontend
npm install
npm run dev
```

_Frontend will be available at usually http://localhost:5173 (check terminal output)._
