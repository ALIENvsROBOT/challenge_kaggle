# MedGemma FHIR-Bridge Python Setup Documentation

This document provides a comprehensive overview of the `Python_Scripts` setup for the MedGemma FHIR-Bridge. This system is designed to autonomously extract medical data from images (e.g., CBC lab reports), validate it against clinical rules, and output high-fidelity HL7 FHIR R4 Bundles.

## 📂 File Manifest

The core logic resides in `Python_Scripts/medgemma/`. The entry point is `medGemma_processor.py`.

| File                         | Purpose                                                                                                                                              |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`medGemma_processor.py`**  | **Entry Point.** Orchestrates the entire pipeline: image upload -> MedGemma inference -> Validation -> Repair Loop -> FHIR Generation.               |
| **`medgemma/client.py`**     | **API Client.** Handles HTTP communication with the vLLM/OpenAI-compatible endpoint. Supports multimodal (image+text) requests.                      |
| **`medgemma/extraction.py`** | **Core Logic.** Contains the prompt engineering, TSV/JSON parsing, and **Self-Healing Business Logic** (e.g., unit normalization, platelet scaling). |
| **`medgemma/fhir.py`**       | **Schema Enforcement.** Converts raw extracted dictionaries into valid HL7 FHIR R4 Bundle resources (Patient, Observation).                          |
| **`medgemma/schema.py`**     | **JSON Schema.** Defines the strict structure expected for Structured Outputs (if enabled).                                                          |
| **`medgemma/utils.py`**      | **Helpers.** formatting functions, unit normalization maps, and identifying JSON blocks in raw text.                                                 |

---

## 🏗️ Architecture & Flow

### 1. The "Reader" (LLM Inference)

- **Source:** `medGemma_processor.main()` calling `client.query()`
- The system sends the image (`test.png`) to the MedGemma 1.5 4B model hosted via vLLM.
- **Prompting:** It uses a specialized prompt (`extraction.build_extraction_prompt`) asking for a strict TSV or JSON output representing the lab table.

### 2. The "Refiner" (Extraction & Normalization)

- **Source:** `medgemma.extraction`
- The raw text is parsed into a Python dictionary.
- **Normalization:**
  - **Names:** "W.B.C" → "Total W.B.C. Count"
  - **Units:** "mill/cmm", "million/mm3" → "mill/cmm"
  - **Flags:** "[H]" symbols are moved to the `flag` field.

### 3. The "Auditor" (Self-Healing Logic)

- **Source:** `sanitize_extraction()` in `medgemma/extraction.py`
- This is the **critical safety layer** that prevents common LLM hallucinations.
- **Key Example: Platelet Correction**
  - _Problem:_ Lab reports often display Platelet counts as `370` (implying `x10^3/uL`) but the unit column says `/uL`. An LLM reads this literally as "370 platelets per microliter", which is critically low.
  - _Solution:_ The Auditor detects this semantic mismatch (Value < 1000 AND Unit == `/uL` for Platelets) and **mathematically corrects it** by multiplying by 1000 (370 → 370,000). It also invalidates any hallucinated "Low" flags to force re-calculation.

### 4. The "Publisher" (FHIR Construction)

- **Source:** `medgemma.fhir`
- The sanitized data is mapped to FHIR Resources:
  - **Patient:** `Resource/Patient` (with logic to clean names and identifiers).
  - **Observation:** `Resource/Observation` for each lab row.
- **Validation:** `validate_bundle_minimal()` checks for strict FHIR compliance (e.g., correct `valueQuantity` structure, `referenceRange` presence).

---

## 🚀 How to Run

### Prerequisites

- Python 3.12+
- `uv` package manager (recommended) or standard `pip`.
- A running instance of vLLM serving `google/medgemma-1.5-4b-it`.

### Environment Variables (.env)

Create a `.env` file in the root:

```ini
medGemma_endpoint="http://localhost:8000/v1"
medGemma_api_key="your-key"
medGemma_model="google/medgemma-1.5-4b-it"
medGemma_strict_extraction="1"  # Enforce strict completeness checks
medGemma_allow_report_date="1"  # Parse report dates if visible
```

### Execution

Run the processor via `uv`:

```bash
uv run Python_Scripts/medGemma_processor.py
```

### Output

- **Console:** Logs the attempt count and status.
- **File:** `medgemma_output.json` (The final FHIR Bundle).
- **Logs:** `temp_output.log` (Raw model responses for debugging).

---

## 🛡️ Professional Standards Implemented

1.  **Strict Typing:** All Python functions use `typing` hints for maintainability.
2.  **Modular Design:** Concerns (Network, Logic, Data Structure) are separated.
3.  **Deterministic Fallback:** If the LLM fails to produce valid JSON, the system retries with increasing error context.
4.  **Clinical Safety Guards:** Hard-coded logic overrides probabilistic AI output for known dangerous edge cases (like unit scaling).

This codebase represents a **Production-Grade** starting point for Edge-AI medical transcription.
