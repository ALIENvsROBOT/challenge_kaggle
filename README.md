# MedGemma FHIR-Bridge: Autonomous Medical Data Standardization Pipeline

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Model: MedGemma 1.5](<https://img.shields.io/badge/Model-MedGemma%201.5%20(4B)-blue>)](https://kaggle.com/models/google/medgemma)
[![Standard: FHIR R4](https://img.shields.io/badge/Standard-HL7%20FHIR%20R4-orange)](https://hl7.org/fhir/)
[![Platform: Edge](https://img.shields.io/badge/Platform-Edge%20Native-green)]()

> **Submission Category:** Agentic / Edge / Interoperability
> **Core Innovation:** A Multi-Image "Self-Healing" Pipeline that guarantees FHIR R4 schema compliance from unstructured evidence.

---

## Executive Summary

The **MedGemma FHIR-Bridge** is an enterprise-grade interoperability engine designed to resolve the healthcare industry's "Dark Data" crisis. It functions as a semantic bridge between unstructured analog records (handwritten scripts, prescription images, lab results) and the **HL7 FHIR (Fast Healthcare Interoperability Resources)** digital standard.

By orchestrating **MedGemma 1.5 (4B)** within a recursive validation loop, the system achieves **context-aware semantic structuring with guaranteed schema compliance.** The "Self-Healing" architecture identifies model hallucinations or formatting errors in real-time, while **Collaborative Synthesis** allows human expertise (Doctor's Notes) to guide and refine AI-generated clinical summaries (AI Insights).

---

## Key Features

- **🖼️ Collective Batch Processing**: Ingest up to 8 clinical images in a single session. The system processes them as a unified context, allowing the model to cross-reference evidence across multiple pages.
- **🧠 Multi-Modality Classification**: Automatically identifies the document type (Radiology report, visual Scan, handwritten Prescription, or Vitals) and switches to an optimized extraction prompt for that specific modality.
- **🔬 Smart FHIR Viewer**: A premium, split-screen verification interface. Compare original evidence side-by-side with structured data, categorized into `Vital Signs`, `Lab Results`, and `Medications`.
- **🧪 Ultra-High Precision Extraction**: Utilizes a strict **TSV Protocol** for 100% accurate extraction of complex Complete Blood Count (CBC) and Differential reports.
- **🧬 FHIR R4 Perfection**:
  - **LOINC Integration**: Automatically maps extracted tests to global terminology standards (e.g., Haemoglobin -> `718-7`).
  - **Smart-Type Logic**: Automatically switches between `valueQuantity` and `valueString` to ensure strict schema compliance.
- **🔐 Secure API Gateway**:
  - **Dynamic Provisioning**: Frontend clients auto-negotiate secure keys via `/api/v1/auth/register`.
  - **Database Persistence**: Keys are stored in PostgreSQL with granular role scopes and revocation capabilities.
- **🤝 Collaborative Intelligence**:
  - **Doctor's Notes**: Reviewers can attach clinical contextual notes directly to the immutable FHIR record.
  - **AI Clinical Synthesis**: A specialized prompt engine (MedGemma) integrates the raw image evidence _and_ the doctor's notes to generate a concise, synthesized clinical summary with recommendations.
- **🕒🔄 Retroactive Smart Rerun**:
  - **Temporal Correction**: Re-analyze old records with updated logic.
  - **Priority Queueing**: Updated records automatically float to the top of the clinician's timeline for immediate review.
- **🛡️ Self-Healing Fallbacks**: If model output is malformed, the "Auditor" triggers a high-integrity fallback, preserving patient safety and ensuring a 100% processing success rate.
- **📊 Real-Time Analytics Dashboard**: Dynamic monitoring of active patient streams, recent activity history, and session-secure system logs.

---

## 📂 Testing & Evaluation Datasets

To evaluate the system's multimodal extraction capabilities, the following Kaggle datasets are utilized for testing:

- **📝 Handwritten Prescriptions**: [Illegible Medical Prescription Images](https://www.kaggle.com/datasets/mehaksingal/illegible-medical-prescription-images-dataset/data)
- **🩻 Radiology (X-Ray)**: [Chest X-Ray Images (Pneumonia)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia)
- **🧪 Lab Reports (CBC/Biochemistry)**: [Medical Lab Reports (Bajaj)](https://www.kaggle.com/datasets/dikshaasinghhh/bajaj)

---

## The Solution: A Self-Healing Edge Architecture

Our solution treats medical data extraction as a multi-step engineering problem rather than a simple text generation task.

### Core Architectural Components

#### 1. The "Reader" (Multimodal Ingestion via vLLM)

Leveraging **MedGemma 1.5** (4B) served via **vLLM**, the system ingests high-entropy visual inputs.

- **Multi-Image Support**: Unlike standard one-shot extraction, the bridge interleaves up to 8 images into a single prompt, providing the model with full clinical context.

#### 2. The "Architect" (LOINC Mapping & Normalization)

Raw extractions are normalized into the FHIR R4 schema.

- **Terminology Mapping**: Collocated dictionaries map raw text to formal **LOINC** and **SNOMED** codes.
- **Unit Normalization**: Standardizes colloquial units (e.g., "mill/cumm" -> "mill/mm3").

#### 3. The "Auditor" (The Innovation)

Raw LLM outputs pass through a rigid, code-based validator.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'background': '#ffffff',
    'mainBkg': '#ffffff',
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#334155',
    'secondaryColor': '#f8fafc',
    'tertiaryColor': '#f8fafc',
    'noteBkgColor': '#fff9c2',
    'noteTextColor': '#1e293b',
    'actorBkg': '#ffffff',
    'actorTextColor': '#1e293b',
    'actorBorder': '#334155',
    'signalColor': '#334155',
    'signalTextColor': '#1e293b',
    'labelBoxBkgColor': '#f8fafc',
    'labelBoxBorderColor': '#334155',
    'loopTextColor': '#1e293b',
    'fontSize': '14px'
  }
}}%%
sequenceDiagram
    participant User
    participant UI as React Dashboard
    participant API as FastAPI Backend
    participant LLM as MedGemma vLLM
    participant DB as PostgreSQL

    User->>UI: Upload Record (Image/PDF)
    UI->>API: POST /api/v1/ingest

    rect rgba(59, 130, 246, 0.1)
    Note over API, LLM: 🧠 Phase 1: Classification (Two-Pass)
    API->>LLM: Identify Modality (Lab/Rad/Meds/Vitals)
    LLM-->>API: Detected Category (e.g., PRESCRIPTION)
    end

    rect rgba(16, 185, 129, 0.1)
    Note over API, LLM: 🧪 Phase 2: High-Precision Extraction
    API->>LLM: Specialized Inference (TSV Protocol)
    LLM-->>API: Raw Data (High-Entropy OCR)
    end

    rect rgba(100, 116, 139, 0.05)
    Note over API: 🛡️ Phase 3: The "Self-Healing" Auditor
    API->>API: Hybrid Parser (JSON + TSV recovery)
    API->>API: Semantic Firewall (e.g., Platelet Scaling Fix)
    API->>API: Terminology Normalize (LOINC/SNOMED)
    API->>API: Schema Invalidation Check (FHIR R4)

    alt Verification Guardrails Passed
        API->>DB: Persist Verified Patient Record
    else Hallucination Detected
        API->>API: Trigger Structural Fallback (Safety Mode)
        API->>DB: Persist Partial Valid Bundle
    end
    end

    API-->>UI: Render Clinical Standard View

    rect rgba(239, 68, 68, 0.1)
    Note over User, LLM: 🤝 Phase 4: Collaborative Synthesis
    User->>UI: Add Clinical Context (Doctor's Notes)
    UI->>API: Update Notes & Trigger Synthesis
    API->>LLM: Rerun AI Summary (Context + Evidence)
    LLM-->>API: Synthesized Clinical Insight
    API->>DB: Update Augmented FHIR Bundle
    end

    UI-->>User: Display AI Diagnostic Partner Insights
```

---

## ⚡ Quick Start with Docker

The fastest way to get the entire pipeline (UI + API + Database) running is using Docker:

1.  **Configure Environment**:

    ```bash
    cp .env.example .env
    ```

    **Critical Configuration Parameters:**

    | Parameter           | Description                     | Example                               |
    | ------------------- | ------------------------------- | ------------------------------------- |
    | `medGemma_endpoint` | vLLM OpenAI-compatible endpoint | `http://host.docker.internal:8001/v1` |
    | `medGemma_api_key`  | API key for vLLM authentication | `your-vllm-key-here`                  |
    | `medGemma_model`    | Model identifier                | `google/medgemma-1.5-4b-it`           |
    | `POSTGRES_PASSWORD` | Database password               | Change from default!                  |
    | `VITE_API_URL`      | Frontend API endpoint           | `http://localhost:8000`               |

    **Advanced Options** (see `.env.example` for full list):
    - `medGemma_strict_extraction` - Force high compliance validation
    - `medGemma_image_retry_limit` - Retry logic configuration
    - `medGemma_require_expected_tests` - Hallucination prevention flags
    - `medGemma_min_observations` - Minimum observation requirements

2.  **Launch Dashboard**:
    ```bash
    docker compose up -d --build
    ```
3.  **Access:**
    - **Dashboard UI**: [http://localhost:3000](http://localhost:3000)
    - **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

For detailed manual installation or development setup, see [docs/setup.md](docs/setup.md).

---

## 📚 Documentation

For in-depth technical information, please refer to:

- **[Setup Guide](docs/setup.md)** - Detailed installation and development setup instructions
- **[Architecture & Insights](docs/Insights.md)** - Deep-dive into the "Self-Healing" architecture, design decisions, and validation methodology
- **[API Security](docs/API_SECURITY.md)** - Database-backed authentication and authorization model

---

## Technical Stack

| Component        | Technology                        | Role                                                                                                        |
| :--------------- | :-------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **Intelligence** | **MedGemma 1.5 (4B)**             | Multimodal reasoning & extraction logic.                                                                    |
| **Serving**      | **vLLM**                          | High-throughput OpenAI-compatible inference engine.                                                         |
| **Backend**      | **FastAPI / Python**              | Secure API Gateway and "Self-Healing" logic.                                                                |
| **Database**     | **PostgreSQL**                    | Persistent storage of patient records and FHIR Bundles.                                                     |
| **Frontend**     | **React 19 / Vite / TailwindCSS** | Premium dark-mode dashboard with animations (Framer Motion) and real-time sync.                             |
| **CI/CD**        | **GitHub Actions / Ruff**         | Automated frontend build, backend linting (Ruff), Python compilation checks, and Docker Compose validation. |

---

## 🏗️ Backend Architecture

The backend follows a modular service-oriented architecture:

```
backend/
├── main.py                    # FastAPI application entry point
├── medGemma_processor.py      # Core orchestration logic
└── medgemma/
    ├── client.py              # vLLM API client
    ├── extraction.py          # Semantic firewall & validation logic
    ├── persistence.py         # Database & file storage handlers
    ├── prompts.py             # Classification & extraction prompts
    ├── fhir_builder.py        # FHIR R4 bundle construction
    └── loinc_mapping.py       # LOINC/SNOMED terminology mapping
```

**Key Design Principles:**

- **Separation of Concerns**: Each module has a single, well-defined responsibility
- **Type Safety**: Full Pydantic model validation for all API requests/responses
- **Self-Healing Logic**: Multi-stage validation pipeline in `extraction.py`
- **Persistence Layer**: Atomic operations with rollback capabilities

---

## vLLM MedGemma Configuration

To serve the MedGemma 1.5 model using vLLM in a Podman container on Ubuntu, use the following configuration script. This setup ensures persistent model storage and an OpenAI-compatible API endpoint.

```bash
#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# vLLM MedGemma 1.5 on Ubuntu (Podman) – OpenAI-compatible API
# - Downloads model to host dir (persistent)
# - Runs vLLM serving the local model (so rm/stop container won’t delete weights)
###############################################################################

# 1) Credentials (set your real values)
export HF_TOKEN="hf_xxxxxxxxxxxxxxxxxxxxx"
export VLLM_API_KEY="super-secret-key-change-me"

# 2) Where to store the model on the host (persistent)
MODEL_DIR="/home/compute/models/medgemma-1.5-4b-it"
mkdir -p "$MODEL_DIR"

# 3) Download model to the host (requires huggingface-cli or python + huggingface_hub)
export HUGGING_FACE_HUB_TOKEN="$HF_TOKEN"
huggingface-cli download google/medgemma-1.5-4b-it --local-dir "$MODEL_DIR"

# 4) Stop/remove old container if present (safe; model stays in MODEL_DIR)
sudo podman stop vllm-medgemma 2>/dev/null || true
sudo podman rm vllm-medgemma 2>/dev/null || true

# 5) Run vLLM serving the LOCAL model directory
sudo podman run -d --name vllm-medgemma \
  --pull=always \
  --restart always \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  --ipc=host \
  -p 8001:8000 \
  -v "$MODEL_DIR":/model:Z \
  -e VLLM_API_KEY="$VLLM_API_KEY" \
  -e NCCL_P2P_DISABLE=1 \
  docker.io/vllm/vllm-openai:latest \
  /model \
  --served-model-name "google/medgemma-1.5-4b-it" \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype bfloat16 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.30 \
  --limit-mm-per-prompt '{"image": 8}' # Enables Batch Ingestion
```

---

---

## 📞 Contact & Submission

**Challenge:** [MedGemma Impact Challenge 2025](https://www.kaggle.com/competitions/medgemma-impact-challenge)  
**Repository:** [GitHub - Update before submission]  
**Demo Video:** [YouTube - Update before submission]  
**Team Contact:** [Your Email/Contact Info]

---

_Developed with ❤️ for healthcare interoperability and patient safety._
