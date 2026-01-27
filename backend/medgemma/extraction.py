"""
Extraction Logic Module

This module handles the core "Business Logic" of converting raw string output from the LLM
into structured, normalized, and clinically safe data dictionaries.

Key Responsibilities:
1. Prompt Construction: Building strict instructions for the LLM.
2. Parsing: Converting TSV/JSON strings into Python objects.
3. Normalization: Mapping raw units/names to standard formats (e.g. "mill/cmm" -> "mill/mm3").
4. "Self-Healing": The `sanitize_extraction` function contains critical safety logic to
   override LLM hallucinations, specifically regarding:
   - Platelet Count Scaling (correcting 10^3 shorthand).
   - Absolute Count verification (cross-checking WBC * % vs Abs).
   - Patient Name cleanup.
"""
import os
from typing import Any, Dict, List, Optional

from .utils import (
    infer_unit_by_name,
    normalize_date,
    normalize_name,
    normalize_unit,
    split_value_unit,
    to_number,
)


def format_history_summary(history: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for h in history[-3:]:
        lines.append(f"- attempt {h['attempt']}: {h['status']} ({len(h['errors'])} errors)")
    return "\n".join(lines) if lines else "none"


# --- PROMPT FACTORY ---

def build_classification_prompt() -> str:
    """Step 1: Identify the Document Type"""
    return (
        "Analyze the medical image(s). Classify the document type.\n"
        "Return ONLY one of these strings:\n"
        "LAB_REPORT\n"
        "RADIOLOGY_REPORT   (X-Ray, CT, MRI, Ultrasound)\n"
        "PRESCRIPTION       (Medication list)\n"
        "OTHER\n"
        "\n"
        "Rules:\n"
        "- If it contains tabular blood test results, choose LAB_REPORT.\n"
        "- If it contains an image of a scan or text about 'Lungs', 'Heart', 'Bones' findings, choose RADIOLOGY_REPORT.\n"
        "- If it lists drugs/dosage, choose PRESCRIPTION.\n"
        "- Output NOTHING else. No markdown."
    )

def build_lab_prompt() -> str:
    """Step 2a: Extract Lab Data (Strict TSV)"""
    return (
        "You are an expert medical OCR assistant. Your task is to extract the lab results from this image into a STRICT TSV (Tab Separated Values) format.\n"
        "\n"
        "1.  **METADATA**: First, find and extract these fields from the top of the report:\n"
        "    *   PATIENT_NAME: <Full Name>\n"
        "    *   SAMPLE_ID: <ID Number>\n"
        "    *   REPORT_DATE: <Date>\n"
        "    *   MODALITY: LAB\n"
        "\n"
        "2.  **TABLE DATA**: Extract every single row from the test results table.\n"
        "    *   **Header**: NAME\tVALUE\tUNIT\tREF_RANGE\tFLAG\n"
        "        (Note: If the table has a 'TEST' column, map it to 'NAME')\n"
        "    *   **FLAG Column**: If the result is marked with 'H', 'High', 'L', 'Low', or bold/star, put 'H' or 'L' in this column. Otherwise leave it empty.\n"
        "    *   **REF_RANGE Column**: Extract the reference range string exactly as shown (e.g. '13.0 - 17.0').\n"
        "    *   **VALUE Column**: Extract the number only. Remove any units or flags from this column.\n"
        "\n"
        "Output Format Example:\n"
        "PATIENT_NAME: John Doe\n"
        "SAMPLE_ID: 123456\n"
        "REPORT_DATE: 2024-01-01\n"
        "MODALITY: LAB\n"
        "NAME\tVALUE\tUNIT\tREF_RANGE\tFLAG\n"
        "Haemoglobin\tXX.X\tg/dl\t13.0-17.0\t\n"
        "WBC Count\tYYYY\t/cumm\t4000-11000\tH\n"
        "\n"
        "CRITICAL INSTRUCTIONS:\n"
        "- Extract ONLY text that is visible in the provided image.\n"
        "- Do NOT use values from the example above.\n"
        "- If a field is not found, leave it blank.\n"
    )

def build_radiology_prompt() -> str:
    """Step 2b: Extract Radiology Findings (Expert Diagnostic Prompt)"""
    return (
        "You are a Senior Radiologist Consultant. Your task is to provide a structured diagnostic interpretation of this medical scan (X-RAY, CT, MRI, etc.).\n"
        "\n"
        "### CRITICAL EXTRACTION RULES ###\n"
        "1. **MULTIPLE ROWS**: You MUST output EVERY anatomical finding as a SEPARATE ROW in the TSV table.\n"
        "2. **DO NOT CONCATENATE**: Never put all findings into one row. Break them down by anatomy (e.g., Lungs, Heart, Pleura, Bones).\n"
        "3. **STRICT TSV**: Use ONLY Tabs between columns. Header: ANATOMY\tFINDING\tFLAG\n"
        "\n"
        "### ANATOMY CHECKLIST (Extract at least 4-5 rows if visible) ###\n"
        "- **LUNGS**: Describe parenchyma, opacities, or nodules.\n"
        "- **HEART**: Describe size and silhouette.\n"
        "- **PLEURA**: Describe effusions or thickening.\n"
        "- **BONES**: Describe fractures or alignment.\n"
        "- **IMPRESSION**: Summarize the final diagnosis in the LAST row.\n"
        "\n"
        "Metadata Block:\n"
        "PATIENT_NAME: <name or 'Unknown'>\n"
        "MODALITY: X-RAY\n"
        "\n"
        "Output Example (REQUIRED STRUCTURE):\n"
        "ANATOMY\tFINDING\tFLAG\n"
        "Lungs\tPatchy opacities detected\tH\n"
        "Heart\tMild cardiomegaly observed\tH\n"
        "Pleura\tNo effusion\t\n"
        "Bones\tIntact, no fractures\t\n"
        "IMPRESSION\tPneumonia with cardiomegaly\tH\n"
    )

def build_meds_prompt() -> str:
    """Step 2c: Extract Medications"""
    return (
        "You are an expert pharmacist. Extract the medication list from this prescription into a STRICT TSV format.\n"
        "\n"
        "1. **METADATA**: Extract Patient Name and Date if visible.\n"
        "2. **DRUGS**: List every drug found.\n"
        "\n"
        "Metadata:\n"
        "PATIENT_NAME: <name>\n"
        "MODALITY: MEDS\n"
        "\n"
        "Header: DRUG\tDOSAGE\tFREQUENCY\n"
        "\n"
        "Guidelines:\n"
        "- **DRUG**: Name of the medicine (e.g., 'Amoxicillin').\n"
        "- **DOSAGE**: Strength (e.g., '500mg').\n"
        "- **FREQUENCY**: How often (e.g., 'Twice Daily', 'BD', 'TID').\n"
        "- If dosage/freq are combined, split them if possible, or put remaining info in FREQUENCY.\n"
        "\n"
        "CRITICAL:\n"
        "- Extract ONLY real text. Do NOT invent drugs.\n"
        "- Output TSV only.\n"
    )

def build_summary_prompt(notes: str = "") -> str:
    """Step 3: Generate Intelligent Summary"""
    context_block = f"DOCTOR'S NOTES: {notes}\n" if notes else ""
    return (
        "You are an expert Medical Consultant. Your task is to provide a concise, collaborative clinical summary based on the provided medical image and any doctor's notes.\n"
        "\n"
        f"{context_block}"
        "\n"
        "INSTRUCTIONS:\n"
        "1. **Analyze the Image**: Identify the type of report/scan and summarize the key abnormal findings or critical values.\n"
        "2. **Integrate Notes**: If doctor's notes are provided, incorporate them into your analysis. Do they align with the image findings? Do they suggest a specific diagnosis?\n"
        "3. **Synthesis**: Provide a unified summary paragraph (approx. 3-5 sentences) that highlights the most critical information for immediate clinical decision making.\n"
        "4. **Recommendations**: Suggest 1-2 follow-up actions or tests if applicable based on the findings.\n"
        "\n"
        "OUTPUT FORMAT:\n"
        "Return ONLY the summary text. Do not use Markdown formatting like bolding or headers inside the text, just plain text suitable for a quick read."
    )

def build_extraction_prompt() -> str:
    # Deprecated single-shot prompt, forwarded to Lab for backward compatibility if needed
    return build_lab_prompt()


def build_extraction_repair_prompt(prev_output: str, errors: List[str], history: List[Dict[str, Any]]) -> str:
    summary = format_history_summary(history)
    errors_text = "\n".join(f"- {e}" for e in errors) if errors else "- unknown error"
    format_pref = os.getenv("medGemma_extraction_format", "tsv").strip().lower()
    if format_pref == "tsv":
        return (
            "Previous extraction was invalid or incomplete. Fix it and return TSV ONLY.\n"
            "Do not ask for another image. Use the same image context from the first attempt.\n"
            "Header must be: NAME\\tVALUE\\tUNIT\\tREF_LOW\\tREF_HIGH\\tFLAG\n"
            "Include all test rows; do not include placeholder/example values.\n\n"
            "If previous output included PATIENT_NAME/SAMPLE_ID/REPORT_DATE, carry them forward unchanged.\n\n"
            f"Errors:\n{errors_text}\n\n"
            f"Recent attempts:\n{summary}\n\n"
            f"Previous output:\n{prev_output}"
        )
    return (
        "Previous extraction JSON was invalid or incomplete. Fix it and return JSON ONLY.\n"
        "Do not ask for another image. Use the same image context from the first attempt.\n"
        "Output must start with '{' and end with '}'.\n"
        "Include all test rows; do not include placeholder/example values.\n\n"
        f"Errors:\n{errors_text}\n\n"
        f"Recent attempts:\n{summary}\n\n"
        f"Previous output:\n{prev_output}"
    )


def parse_range(value: str) -> Dict[str, Any]:
    if not isinstance(value, str):
        return {}
    v = value.strip()
    if "-" in v:
        parts = [p.strip() for p in v.split("-", 1)]
        if len(parts) == 2:
            return {"ref_low": to_number(parts[0]), "ref_high": to_number(parts[1])}
    return {}


def parse_tsv_extraction(text: str) -> Optional[Dict[str, Any]]:
    normalized = text.replace("\\t", "\t").replace("\\n", "\n")
    lines = [line.rstrip() for line in normalized.splitlines() if line.strip()]
    if not lines:
        return None

    patient: Dict[str, Any] = {"id": "patient-1"}
    observations: List[Dict[str, Any]] = []
    report_date = None
    header_idx = None

    # Valid headers we recognize
    valid_cols = {"NAME", "TEST", "ANALYTE", "ANATOMY", "REGION", "FINDING", "OBSERVATION", "DRUG", "MEDICATION"}

    detected_modality = None

    for idx, line in enumerate(lines):
        upper = line.upper().strip()
        if upper == "TSV":
            continue
        if upper.startswith("PATIENT_NAME:"):
            patient["name"] = line.split(":", 1)[1].strip()
            continue
        if upper.startswith(("SAMPLE_ID:", "ID:", "MRN:")):
            patient["identifier"] = line.split(":", 1)[1].strip()
            continue
        if upper.startswith("REPORT_DATE:"):
            report_date = line.split(":", 1)[1].strip()
            continue
        if upper.startswith("MODALITY:"):
            patient["modality"] = line.split(":", 1)[1].strip().upper()
            continue
        
        # Check for header row
        import re
        parts = [p.strip().upper() for p in re.split(r"[\t|]|\s{2,}", line) if p.strip()]
        if len(parts) >= 2 and parts[0] in valid_cols:
            header_idx = idx
            if parts[0] in {"ANATOMY", "REGION", "FINDING"}:
               detected_modality = "RADIOLOGY"
            break
            
    if detected_modality and not patient.get("modality"):
        patient["modality"] = detected_modality

    # If no header found, assume data starts after metadata blocks
    # We will just look for ANYTHING that looks like "String [tab] String"
    start_idx = header_idx + 1 if header_idx is not None else 0
    
    for line in lines[start_idx:]:
        clean_line = line.strip()
        if not clean_line:
            continue
        
        # Skip metadata lines if we missed them above
        if ":" in clean_line and clean_line.split(":")[0].upper().rstrip(":").endswith(("NAME", "ID", "MRN", "DATE", "MODALITY")):
            continue

        # Split by tab, pipe, or double-space
        if "\t" in line:
            parts = [p.strip() for p in line.split("\t")]
        elif "|" in line:
            parts = [p.strip() for p in line.split("|")]
        elif ":" in line and not line.strip().upper().endswith(":"):
             # Fallback for "Key: Value" format (common in Radiology output)
             # But be careful not to split timestamps like 12:00
             # Heuristic: split on FIRST colon
             parts = [p.strip() for p in line.split(":", 1)]
        else:
            parts = [p.strip() for p in re.split(r"\s{2,}", line) if p.strip()]
            
        if len(parts) < 2:
            # Try splitting by colon if it's "Anatomy: Finding" format
            if ":" in clean_line:
                parts = [p.strip() for p in clean_line.split(":", 1)]
            else:
                continue
            
        if len(parts) < 2:
            continue
            
        # Ignore obvious header repeats
        if parts[0].upper() in valid_cols:
            continue
            
        # Extract fields
        name = parts[0]
        val = parts[1]
        
        # Heuristic: If name looks like a finding key
        if not patient.get("modality"):
            if any(k in name.lower() for k in ["lung", "chest", "heart", "mediastinum", "bone", "fracture", "opacity", "impression"]):
                 patient["modality"] = "X-RAY"

        # Handle simplified radiology rows: Anatomy, Finding, [Flag]
        unit = ""
        ref_low = ""
        ref_high = ""
        flag = ""
        
        mod = (patient.get("modality") or "").upper()
        if mod in ["IMAGING", "RADIOLOGY", "X-RAY", "CT", "MRI"]:
            # Radiology format: ANATOMY, FINDING, FLAG
            if len(parts) >= 3:
                flag = parts[2].strip()
        else:
            # Lab format: NAME, VALUE, UNIT, REF_RANGE, FLAG
            if len(parts) >= 3:
                unit = parts[2].strip()
            if len(parts) >= 4:
                rr_str = parts[3].strip()
                parsed_range = parse_range(rr_str)
                if parsed_range:
                    ref_low = parsed_range.get("ref_low")
                    ref_high = parsed_range.get("ref_high")
            if len(parts) >= 5:
                flag = parts[4].strip()
        
        # Backward compatibility for strict 6-column splitting
        if len(parts) >= 6 and not ref_low and not ref_high:
             unit, ref_low, ref_high, flag = parts[2:6]

        obs = {"name": name, "value": val}
        if unit:
            obs["unit"] = unit
        
        # Clean Flag
        clean_flag = flag.strip().upper().replace("[", "").replace("]", "")
        if clean_flag in {"H", "HIGH", "HI", "A", "ABN", "ABNORMAL"}:
            obs["flag"] = "H"
        elif clean_flag in {"L", "LOW", "LO"}:
            obs["flag"] = "L"
            
        if ref_low:
            obs["ref_low"] = ref_low
        if ref_high:
            obs["ref_high"] = ref_high
        
        observations.append(obs)

    if not observations:
        return None
    return {"patient": patient, "observations": observations, "report_date": report_date}


def sanitize_extraction(extraction: Dict[str, Any]) -> Dict[str, Any]:
    allow_gender = os.getenv("medGemma_allow_gender", "0").strip().lower() in {"1", "true", "yes"}
    if not isinstance(extraction, dict):
        return {"patient": {"id": "patient-1"}, "observations": []}

    patient = extraction.get("patient") if isinstance(extraction.get("patient"), dict) else {}
    if not patient and isinstance(extraction.get("p"), dict):
        patient = extraction.get("p", {})
    if not patient:
        patient = {"id": "patient-1"}
    patient.setdefault("id", "patient-1")

    gender = patient.get("gender")
    if isinstance(gender, str):
        g = gender.strip().lower()
        if g in {"male", "female", "other", "unknown"} and allow_gender:
            patient["gender"] = g
        else:
            patient.pop("gender", None)
    elif "gender" in patient and not allow_gender:
        patient.pop("gender", None)

    name = patient.get("name")
    if isinstance(name, str):
        if name.strip().lower() in {"<empty>", "unknown", "na", "n/a"}:
            patient.pop("name", None)
            name = None
        parts = [p for p in name.strip().split() if p]
        if len(parts) >= 2:
            patient["name"] = {"given": parts[:-1], "family": parts[-1]}
        else:
            patient["name"] = {"given": parts} if parts else {}
        name = patient.get("name")
    if isinstance(name, dict):
        given = name.get("given")
        if isinstance(given, str):
            name["given"] = [given]
        def _clean_token(token: str) -> str:
            t = token.strip()
            for bad in ["dr.", "dr", "md", "mrs", "mr", "ms"]:
                if t.lower() == bad:
                    return ""
            return t

        given_list = name.get("given")
        if isinstance(given_list, list):
            cleaned_given = []
            for g in given_list:
                if isinstance(g, str):
                    ct = _clean_token(g)
                    if ct:
                        cleaned_given.append(ct)
            if cleaned_given:
                name["given"] = cleaned_given
            else:
                name.pop("given", None)

        family = name.get("family")
        if isinstance(family, str):
            cleaned_family = " ".join([t for t in (_clean_token(t) for t in family.split()) if t])
            if cleaned_family:
                name["family"] = cleaned_family
            else:
                name.pop("family", None)
        if "family" not in name:
            given_list = name.get("given")
            if isinstance(given_list, list) and len(given_list) >= 2:
                name["family"] = given_list[-1]
                name["given"] = given_list[:-1]
        if name.get("given") == ["<empty>"]:
            name.pop("given", None)
        if not name:
            patient.pop("name", None)

    observations = extraction.get("observations")
    if not isinstance(observations, list):
        observations = extraction.get("obs")
    
    # HEAL FLAT JSON: If extraction itself looks like a single observation
    if not isinstance(observations, list):
        if any(k in extraction for k in ["name", "test", "analyte", "v", "value"]):
            observations = [extraction]
        else:
            observations = []

    identifier = patient.get("identifier")
    if identifier is None and isinstance(patient.get("id2"), str):
        identifier = patient.get("id2")
    if isinstance(identifier, str):
        ident = identifier.strip()
        if ident.isdigit():
            patient["identifier"] = ident
        else:
            patient.pop("identifier", None)

    cleaned_obs: List[Dict[str, Any]] = []
    for o in observations:
        if not isinstance(o, dict):
            continue
        name = o.get("name") or o.get("test") or o.get("analyte") or o.get("n")
        if not isinstance(name, str):
            continue
        n = normalize_name(name)
        if not n or n.lower() in {"test name", "<test name>", "example", "sample"}:
            continue
        if n.strip().lower() in {"platelets", "platelet"}:
            n = "Platelet Count"
        value = o.get("value") or o.get("result") or o.get("v")
        if value is None:
            continue
        unit = normalize_unit(o.get("unit") or o.get("u"))
        ref_low = o.get("ref_low") if "ref_low" in o else o.get("low")
        if ref_low is None:
            ref_low = o.get("lo")
        ref_high = o.get("ref_high") if "ref_high" in o else o.get("high")
        if ref_high is None:
            ref_high = o.get("hi")
        flag = o.get("flag") or o.get("fl")

        value_parts = split_value_unit(value)
        cleaned = {"name": n, "value": value_parts.get("value")}
        if value_parts.get("flag"):
            flag = value_parts.get("flag")
        if unit is None and value_parts.get("unit"):
            unit = normalize_unit(value_parts.get("unit"))
        if isinstance(unit, str):
            unit = normalize_unit(unit)

        if "platelet count" in n.lower() and unit == "fL":
            n = "MPV"
            cleaned["name"] = n



        inferred = infer_unit_by_name(n)
        if inferred:
            if unit is None or normalize_unit(unit) != inferred:
                unit = inferred
        if unit:
            cleaned["unit"] = unit
        if "mpv" in n.lower():
            cleaned["unit"] = "fL"
        if "immature platelet fraction" in n.lower():
            cleaned["unit"] = "%"

        range_parts = None
        if isinstance(ref_low, str) and "-" in ref_low:
            range_parts = parse_range(ref_low)
        if isinstance(ref_high, str) and "-" in ref_high:
            range_parts = parse_range(ref_high)
        if range_parts:
            cleaned["ref_low"] = range_parts.get("ref_low")
            cleaned["ref_high"] = range_parts.get("ref_high")
            unit_parts = split_value_unit(ref_high if isinstance(ref_high, str) else ref_low)
            if not cleaned.get("unit") and unit_parts.get("unit"):
                cleaned["unit"] = normalize_unit(unit_parts.get("unit"))
        else:
            if ref_low is not None:
                low_parts = split_value_unit(ref_low)
                if low_parts.get("value") is not None:
                    cleaned["ref_low"] = low_parts.get("value")
                    if not cleaned.get("unit") and low_parts.get("unit"):
                        cleaned["unit"] = normalize_unit(low_parts.get("unit"))
            if ref_high is not None:
                high_parts = split_value_unit(ref_high)
                if high_parts.get("value") is not None:
                    cleaned["ref_high"] = high_parts.get("value")
                    if not cleaned.get("unit") and high_parts.get("unit"):
                        cleaned["unit"] = normalize_unit(high_parts.get("unit"))

        # Fix Platelet Count scaling (e.g. 370 -> 370,000 if unit is /uL)
        # Labs often report 370 10^3/uL, but if unit is scraped as /uL, it's 1000x off.
        if "platelet count" in n.lower() and (unit == "/uL" or unit is None):
             v = cleaned.get("value")
             if isinstance(v, (int, float)) and 0 < v < 1000:
                  cleaned["value"] = v * 1000.0
                  # Fix ranges too if they match the scale
                  if isinstance(cleaned.get("ref_low"), (int, float)) and cleaned["ref_low"] < 1000:
                       cleaned["ref_low"] = cleaned["ref_low"] * 1000.0
                  if isinstance(cleaned.get("ref_high"), (int, float)) and cleaned["ref_high"] < 1000:
                       cleaned["ref_high"] = cleaned["ref_high"] * 1000.0
                  # Force re-calculation of flag since values changed
                  flag = None

        if isinstance(flag, str) and flag.strip().upper() in {"H", "L"}:
            cleaned["flag"] = flag.strip().upper()
        else:
            try:
                v = cleaned.get("value")
                low_v = cleaned.get("ref_low")
                high_v = cleaned.get("ref_high")
                if isinstance(v, (int, float)) and isinstance(low_v, (int, float)) and v < low_v:
                    cleaned["flag"] = "L"
                if isinstance(v, (int, float)) and isinstance(high_v, (int, float)) and v > high_v:
                    cleaned["flag"] = "H"
            except Exception:
                pass

        cleaned_obs.append(cleaned)


    # De-duplicate rows: prefer entries whose unit matches expected unit
    deduped: Dict[str, Dict[str, Any]] = {}
    for o in cleaned_obs:
        key = o.get("name")
        if not isinstance(key, str):
            continue
        expected_unit = infer_unit_by_name(key)
        current = deduped.get(key)
        if current is None:
            deduped[key] = o
            continue
        if expected_unit:
            cur_unit = normalize_unit(current.get("unit")) if current.get("unit") else None
            new_unit = normalize_unit(o.get("unit")) if o.get("unit") else None
            if cur_unit != expected_unit and new_unit == expected_unit:
                deduped[key] = o
                continue
        # Otherwise keep the first seen

    allow_report_date = os.getenv("medGemma_allow_report_date", "0").strip().lower() in {"1", "true", "yes"}
    # Fix absolute counts based on WBC * % when off by factor of 10
    obs_list = list(deduped.values())
    wbc_value = None
    for o in obs_list:
        name = str(o.get("name", "")).lower()
        if "w.b.c" in name or "wbc" in name:
            if isinstance(o.get("value"), (int, float)):
                wbc_value = o.get("value")
                break
    if isinstance(wbc_value, (int, float)) and wbc_value > 0:
        percent_map = {}
        abs_map = {}
        for o in obs_list:
            name = str(o.get("name", "")).lower()
            if name in {"neutrophils", "lymphocytes", "eosinophils", "monocytes", "basophils"}:
                if isinstance(o.get("value"), (int, float)):
                    percent_map[name] = o
            if "abs" in name and any(k in name for k in ["neutrophils", "lymphocytes", "eosinophils", "monocytes", "basophils"]):
                if isinstance(o.get("value"), (int, float)):
                    abs_map[name] = o
        for cell in ["neutrophils", "lymphocytes", "eosinophils", "monocytes", "basophils"]:
            pct_obs = percent_map.get(cell)
            abs_obs = None
            for key, val in abs_map.items():
                if cell in key:
                    abs_obs = val
                    break
            if not pct_obs or not abs_obs:
                continue
            expected = wbc_value * pct_obs["value"] / 100.0
            actual = abs_obs.get("value")
            if not isinstance(actual, (int, float)):
                continue
            if expected > 0:
                if abs(actual - expected) / expected > 0.25:
                    if abs(actual * 10 - expected) / expected < 0.1:
                        abs_obs["value"] = round(expected, 2)

    report_date = normalize_date(extraction.get("report_date") or extraction.get("d")) if allow_report_date else None

    return {"patient": patient, "observations": obs_list, "report_date": report_date}


def validate_extraction(extraction: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if not isinstance(extraction, dict):
        return ["Extraction output must be a JSON object."]

    obs = extraction.get("observations")
    if not isinstance(obs, list) or not obs:
        errors.append("observations must be a non-empty array.")
        return errors

    min_obs = int(os.getenv("medGemma_min_observations", "1"))
    if len(obs) < min_obs:
        errors.append(f"observations must include at least {min_obs} rows (found {len(obs)}).")

    require_patient = os.getenv("medGemma_require_patient", "1").strip().lower() in {"1", "true", "yes"}
    if require_patient:
        patient = extraction.get("patient", {})
        name = patient.get("name")
        if not name:
            errors.append("patient.name is required when medGemma_require_patient=1.")
        identifier = patient.get("identifier") or patient.get("id2")
        if not identifier:
            errors.append("patient.identifier is required when medGemma_require_patient=1.")

    for i, o in enumerate(obs, start=1):
        if not isinstance(o, dict):
            errors.append(f"observations[{i}] must be an object.")
            continue
        name = o.get("name")
        value = o.get("value")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"observations[{i}].name is required.")
        if value is None or (isinstance(value, str) and not value.strip()):
            errors.append(f"observations[{i}].value is required.")

    require_expected = os.getenv("medGemma_require_expected_tests", "0").strip().lower() in {"1", "true", "yes"}
    if require_expected:
        import re

        def norm_key(value: str) -> str:
            return re.sub(r"[^a-z0-9]+", "", value.lower())

        expected_groups = [
            {"haemoglobin", "hemoglobin"},
            {"totalrbccount", "totalrbc"},
            {"haematocritpcvhct", "hematocritpcvhct", "haematocritpcv", "hematocritpcv"},
            {"meancorpuscularvolumemcv", "mcv"},
            {"meancorpuscularhbmch", "mch"},
            {"meancorpuscularhbconcmchc", "meancorpuscularhbcmchc", "mchc"},
            {"redcelldistributionwidthrdw", "redcelldistributionwidthrdwcv", "rdwcv", "rdw"},
            {"totalwbccount", "totalwbc", "wbccount"},
            {"neutrophils"},
            {"lymphocytes"},
            {"eosinophils"},
            {"monocytes"},
            {"basophils"},
            {"plateletcount", "platelets"},
            {"mpv"},
            {"immatureplateletfraction"},
            {"neutrophilsabs"},
            {"lymphocytesabs"},
            {"eosinophilsabs"},
            {"monocytesabs"},
            {"basophilsabs"},
        ]
        got = {norm_key(o.get("name", "")) for o in obs if isinstance(o, dict)}
        missing = []
        for group in expected_groups:
            if not any(item in got for item in group):
                missing.append("/".join(sorted(group)))
        if missing:
            errors.append(
                "missing expected CBC rows: " + ", ".join(missing[:8]) + ("..." if len(missing) > 8 else "")
            )
    return errors
