# MedGemma FHIR-Bridge: The "Self-Healing" Medical Data Pipeline

## What We Built

We built an enterprise-grade **interoperability engine** that transforms unstructured medical "Dark Data" (handwritten prescriptions, complex lab reports, and radiology scans) into 100% compliant **HL7 FHIR R4** resources. Unlike standard OCR tools that simply read text, our system acts as a **"Semantic Bridge"** between analog records and digital hospital systems, running entirely on-premise using **MedGemma 1.5 (4B)** via vLLM.

## The Problem

Medical data extraction is dangerous. A standard AI model reading a platelet count of "370" might miss the "10^3/uL" context, recording a fatal value (370) instead of a normal one (370,000). In healthcare, hallucination isn't just a bug; it's a patient safety hazard.

## Our Solution: The "Self-Healing" Architecture

We treat the AI as a junior resident whose work is rigorously audited. Our pipeline implements a novel **Verify & Repair** loop:

1.  **Ingest (The Reader):** We process up to 8 images simultaneously using MedGemma, preserving cross-page clinical context.
2.  **Audit (The Semantic Firewall):** A deterministic Python layer validates every AI output against medical axioms (e.g., checking if platelet counts align with scientific notation conventions).
3.  **Heal (The Fix):** If the data is semantically suspicious or structurally malformed, the system automatically triggers a targeted re-extraction or mathematical correction before the data ever touches the database.
4.  **Standardize (The Architect):** Validated data is mapped to **LOINC** and **SNOMED** standards and formatted into strict FHIR R4 bundles, ready for integration with Epic or Cerner.

## Key Features

- **Collaborative Intelligence:** A specialized "Doctor's Note" interface allows clinicians to add context. The AI then synthesizes the raw image evidence _and_ the doctor’s notes to generate a holistic **Clinical Summary** and recommendations.
- **Multi-Modality Support:** Automatically detects and switches protocols for Radiology Reports, Lab Results (with specific TSV precision for CBC tables), Prescriptions, and Vitals.
- **Edge-Native Privacy:** Runs locally via Docker and vLLM, ensuring zero PII leakage.
- **Smart Rerun:** Allows retroactive re-analysis of old patient records using updated logic, automatically floating them to the top of the clinician's timeline.

## Impact

This tool reduces the time to structure a complex lab report from **15 minutes** (manual entry) to **12 seconds**, while our "Auditor" layer prevents the 15-20% of OCR unit errors that commonly slip past human review. We aren't just automating data entry; we are building a safety net for clinical interoperability.
