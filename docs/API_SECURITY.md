# API Security & Architecture

> MedGemma v1.6 Security Specs

## Overview

MedGemma employs a **Token-Based Authentication** architecture backed by a PostgreSQL database. Unlike standard API keys which are often hardcoded, MedGemma keys are:

1.  **Dynamically Provisioned**: Clients request a key from the backend upon first launch.
2.  **Database Persisted**: All keys are stored in the `api_keys` table.
3.  **Cryptographically Secure**: Keys are generated using Python's `secrets` module (Hex encoded).
4.  **Role-Based Scope**: Keys have roles (e.g., 'frontend', 'admin') for future RBAC.

## Architecture Flow

### 1. Provisioning (Registration)

When the Frontend Application starts:

1.  It checks `localStorage` for `medgemma_api_keys`.
2.  If missing, it sends a `POST /api/v1/auth/register` request to the backend.
3.  The backend generates a secure `sk-<hash>` key, stores it in PostgreSQL with metadata (name, created_at, active_status).
4.  The backend returns the key to the Frontend.
5.  Frontend encrypts/stores the key in LocalStorage.

### 2. Authentication (Verification)

For every protected action (Ingest, Rerun, Fetch History):

1.  Frontend attaches `Authorization: Bearer sk-...` header.
2.  Backend `verify_api_key` dependency kicks in.
3.  It checks two sources:
    - **Master Key**: Checks if token matches `medGemma_api_key` environment variable (for Admin/root access).
    - **Database**: Queries `SELECT is_active FROM api_keys WHERE key = token`.
4.  If valid, `last_used_at` timestamp is updated in DB.
5.  If invalid, returns `403 Forbidden`.

## Database Schema (`api_keys`)

| Column         | Type         | Description                                                 |
| :------------- | :----------- | :---------------------------------------------------------- |
| `key`          | VARCHAR(100) | PK. The actual secret key (sk-...).                         |
| `name`         | VARCHAR(100) | A human-readable label (e.g. "Frontend Client 2026-01-26"). |
| `role`         | VARCHAR(50)  | Role scope ('frontend', 'admin').                           |
| `is_active`    | BOOLEAN      | Revocation control.                                         |
| `created_at`   | TIMESTAMP    | Audit trail.                                                |
| `last_used_at` | TIMESTAMP    | Usage tracking.                                             |

## Endpoints

### `POST /api/v1/auth/register`

- **Access**: Public (Rate Limited in Prod)
- **Response**:

```json
{
  "key": "sk-1a2b...",
  "name": "Frontend Client ...",
  "created_at": "..."
}
```

### Protected Endpoints

All endpoints under the `/api/v1/` scope (except `auth`) require the valid header.

## Sample Curl Commands

### 1. Register a new API Key

```bash
curl -X POST http://localhost:8000/api/v1/auth/register
```

### 2. List Recent Submissions

```bash
# Replace <YOUR_KEY> with the key from registration
curl -X GET http://localhost:8000/api/v1/submissions?limit=5 \
     -H "Authorization: Bearer <YOUR_KEY>"
```

### 3. Ingest a Medical Record (X-Ray/Lab Report)

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
     -H "Authorization: Bearer <YOUR_KEY>" \
     -F "patient_id=PATIENT-001" \
     -F "files=@/path/to/your/xray.png"
```

### 4. Rerun Analysis for a Record

```bash
# Replace <SUBMISSION_ID> with an existing UUID
curl -X POST http://localhost:8000/api/v1/rerun/<SUBMISSION_ID> \
     -H "Authorization: Bearer <YOUR_KEY>"
```

### 5. Collaborative Work: Save Doctor's Notes

```bash
curl -X POST http://localhost:8000/api/v1/submissions/<SUBMISSION_ID>/notes \
     -H "Authorization: Bearer <YOUR_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"notes": "Patient presents with persistent cough. X-ray suggested."}'
```

### 6. AI Clinical Synthesis

```bash
# Triggers the AI to summarize the scan + doctor's notes
curl -X POST http://localhost:8000/api/v1/submissions/<SUBMISSION_ID>/ai_summary \
     -H "Authorization: Bearer <YOUR_KEY>"
```

---

**Security Note**: In a real-world deployment, the `/register` endpoint should be protected by an initial "Setup Token" or disabled after the first client performs the handshake. For this challenge, it remains open to facilitate the demo workflow without manual DB seeding.
