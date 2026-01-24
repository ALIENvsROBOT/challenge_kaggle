"""
MedGemma API Client Module

This script orchestrates:
1) Multimodal extraction (image -> structured lab data)
2) Deterministic validation/repair
3) FHIR Bundle construction

Run:
  uv run Python_Scripts/medGemma_processor.py
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List

from medgemma.client import MedGemmaClient, MedGemmaConfigError
from medgemma.extraction import (
    build_extraction_prompt,
    build_extraction_repair_prompt,
    parse_tsv_extraction,
    sanitize_extraction,
    validate_extraction,
)
from medgemma.fhir import (
    bundle_from_extraction,
    ensure_interpretation_from_range,
    sanitize_bundle,
    validate_bundle_minimal,
)
from medgemma.utils import extract_json_candidate

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def _parse_extraction(response: str, extraction_format: str) -> Dict[str, object] | None:
    candidate = extract_json_candidate(response)
    if extraction_format == "tsv":
        extraction = parse_tsv_extraction(response)
        if extraction is None:
            try:
                extraction = json.loads(candidate)
            except json.JSONDecodeError:
                extraction = None
        return extraction

    try:
        extraction = json.loads(candidate)
    except json.JSONDecodeError:
        extraction = None
    if extraction is None:
        extraction = parse_tsv_extraction(response)
    return extraction


def main() -> None:
    try:
        with MedGemmaClient() as client:
            extraction_system_prompt = (
                "You are a medical data extraction agent. "
                "Extract ONLY evidence from the image and return the requested format ONLY. "
                "No markdown, no analysis, no chain-of-thought."
            )
            extraction_prompt = build_extraction_prompt()

            script_dir = Path(__file__).resolve().parent
            test_image = script_dir / "test.png"

            logger.info("--- Starting MedGemma Client Test ---")

            use_structured = os.getenv("medGemma_use_structured_outputs", "1").strip().lower() in {
                "1",
                "true",
                "yes",
            }
            max_attempts = int(os.getenv("medGemma_max_attempts", "10"))
            history: List[Dict[str, object]] = []
            last_response: str | None = None
            errors: List[str] = []
            extracted: Dict[str, object] | None = None
            extraction_format = os.getenv("medGemma_extraction_format", "tsv").strip().lower()
            image_retry_limit = int(os.getenv("medGemma_image_retry_limit", "1"))
            require_image_for_extraction = os.getenv("medGemma_require_image", "0").strip().lower() in {
                "1",
                "true",
                "yes",
            }
            log_raw = os.getenv("medGemma_log_raw", "1").strip().lower() in {"1", "true", "yes"}
            raw_log_path = script_dir.parent / "temp_output.log"

            for attempt in range(1, max_attempts + 1):
                is_first = attempt == 1
                send_image = attempt <= image_retry_limit
                if require_image_for_extraction and not send_image:
                    errors = [
                        "Extraction requires image input; increase medGemma_image_retry_limit to retry with image."
                    ]
                    logger.error(errors[0])
                    break

                prompt = (
                    extraction_prompt
                    if is_first
                    else build_extraction_repair_prompt(last_response or "", errors, history)
                )
                logger.info(
                    "Attempt %d/%d | send_image=%s | structured_outputs=%s",
                    attempt,
                    max_attempts,
                    "True" if send_image else "False",
                    "on" if (use_structured and is_first) else "off",
                )

                response = client.query(
                    prompt,
                    image_path=test_image if send_image else None,
                    system_prompt=extraction_system_prompt,
                    structured_schema=None,
                    response_format=None,
                )

                if not response:
                    errors = [f"No response from model on attempt {attempt}."]
                    history.append(
                        {"attempt": attempt, "status": "no_response", "errors": errors, "output": ""}
                    )
                    logger.warning(errors[0])
                    continue
                last_response = response
                if log_raw:
                    with raw_log_path.open("a", encoding="utf-8") as f:
                        f.write(f"\n\n--- attempt {attempt} ---\n")
                        f.write(response)

                extraction = _parse_extraction(response, extraction_format)
                if extraction is None:
                    errors = ["Invalid JSON/TSV: no parseable data found."]
                    history.append(
                        {
                            "attempt": attempt,
                            "status": "invalid_json",
                            "errors": errors,
                            "output": response[:1000],
                        }
                    )
                    logger.warning(errors[0])
                    continue

                extraction = sanitize_extraction(extraction)
                errors = validate_extraction(extraction)
                if errors:
                    history.append(
                        {
                            "attempt": attempt,
                            "status": "invalid_extraction",
                            "errors": errors,
                            "output": response[:1000],
                        }
                    )
                    logger.warning(
                        "Extraction failed with %d error(s): %s",
                        len(errors),
                        "; ".join(errors[:5]),
                    )
                    continue

                history.append({"attempt": attempt, "status": "ok", "errors": [], "output": ""})
                extracted = extraction
                logger.info("Extraction passed. Building FHIR Bundle.")
                break

            if not extracted:
                logger.error("Failed to extract structured lab data within retry limit.")
                for err in errors:
                    logger.error(err)
                return

            bundle = bundle_from_extraction(extracted)
            bundle = sanitize_bundle(bundle)
            ensure_interpretation_from_range(bundle)
            errors = validate_bundle_minimal(bundle)
            if errors:
                logger.error("Failed to build a valid FHIR JSON Bundle from extracted data.")
                for err in errors:
                    logger.error(err)
                return

            output_json = json.dumps(bundle, indent=2)

            if os.getenv("medGemma_print_json", "1").strip().lower() in {"1", "true", "yes"}:
                print(output_json)

            output_file = script_dir.parent / "medgemma_output.json"
            with output_file.open("w", encoding="utf-8") as f:
                f.write(output_json)
            logger.info("Response saved to %s", output_file)

    except MedGemmaConfigError as e:
        logger.critical("Configuration Error: %s", e)


if __name__ == "__main__":
    main()
