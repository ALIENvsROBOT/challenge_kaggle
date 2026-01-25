"""
FHIR Conversion Module

This module ensures that internal data structures are compliant with HL7 FHIR R4 standards
before they are serialized.

Key Features:
- `validate_bundle_minimal`: A lightweight validator ensuring required fields (id, resourceType) exist.
- `bundle_from_extraction`: Maps the internal "normalized" dictionary to nested FHIR resources.
- Strict Type Checking: Ensures `valueQuantity` and `code` follow the specific nesting required by FHIR.
"""
import os
from typing import Any, Dict, List

from .utils import normalize_date, normalize_unit, split_value_unit


def validate_bundle_minimal(bundle: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if not isinstance(bundle, dict):
        return ["Top-level JSON must be an object."]
    if bundle.get("resourceType") != "Bundle":
        errors.append("Bundle.resourceType must be 'Bundle'.")
    if bundle.get("type") != "collection":
        errors.append("Bundle.type must be 'collection'.")
    entry = bundle.get("entry")
    if not isinstance(entry, list) or not entry:
        errors.append("Bundle.entry must be a non-empty array.")
        return errors

    allowed_gender = {"male", "female", "other", "unknown"}
    allowed_q_keys = {"value", "unit", "system", "code", "comparator"}
    allow_vq_codes = os.getenv("medGemma_allow_vq_codes", "0").strip().lower() in {"1", "true", "yes"}
    allow_vq_comparator = os.getenv("medGemma_allow_vq_comparator", "0").strip().lower() in {"1", "true", "yes"}
    strict_placeholders = os.getenv("medGemma_strict_placeholders", "1").strip().lower() in {"1", "true", "yes"}
    min_observations = int(os.getenv("medGemma_min_observations", "3"))

    obs_count = 0
    for i, item in enumerate(entry, start=1):
        res = item.get("resource") if isinstance(item, dict) else None
        if not isinstance(res, dict):
            errors.append(f"entry[{i}].resource must be an object.")
            continue

        rtype = res.get("resourceType")
        if rtype not in {"Patient", "Observation", "MedicationRequest"}:
            errors.append(f"entry[{i}].resourceType must be Patient, Observation, or MedicationRequest.")
            continue

        if "meta" in res:
            errors.append(f"entry[{i}] contains meta (omit meta for concise output).")

        if rtype == "Patient":
            if "id" not in res:
                errors.append(f"Patient in entry[{i}] must include id.")
            gender = res.get("gender")
            if gender is not None and str(gender).lower() not in allowed_gender:
                errors.append(f"Patient.gender in entry[{i}] must be one of {sorted(allowed_gender)}.")
            names = res.get("name")
            if isinstance(names, list):
                for n in names:
                    if not isinstance(n, dict):
                        continue
                    given = n.get("given")
                    if given is not None and not isinstance(given, list):
                        errors.append(f"Patient.name.given in entry[{i}] must be an array of strings.")
                    if strict_placeholders:
                        family = str(n.get("family", "")).strip().lower()
                        given_list = [str(g).strip().lower() for g in given] if isinstance(given, list) else []
                        if family == "doe" and any(g in {"john", "jane"} for g in given_list):
                            errors.append(f"Patient.name in entry[{i}] looks like placeholder (John/Jane Doe).")

        if rtype == "Observation":
            obs_count += 1
            code = res.get("code")
            if not isinstance(code, dict):
                errors.append(f"Observation.code in entry[{i}] must be an object (CodeableConcept).")
            subject = res.get("subject")
            if not isinstance(subject, dict) or "reference" not in subject:
                errors.append(f"Observation.subject.reference in entry[{i}] is required.")
            vq = res.get("valueQuantity")
            if vq is not None:
                if not isinstance(vq, dict):
                    errors.append(f"Observation.valueQuantity in entry[{i}] must be an object.")
                else:
                    extra = set(vq.keys()) - allowed_q_keys
                    if extra:
                        errors.append(
                            f"Observation.valueQuantity in entry[{i}] has invalid keys: {sorted(extra)}."
                        )
                    if not allow_vq_codes and ("system" in vq or "code" in vq):
                        errors.append(
                            f"Observation.valueQuantity in entry[{i}] must not include system/code unless visible."
                        )
                    if not allow_vq_comparator and "comparator" in vq:
                        errors.append(
                            f"Observation.valueQuantity in entry[{i}] must not include comparator unless visible."
                        )
                    if "system" in vq and not isinstance(vq.get("system"), str):
                        errors.append(f"Observation.valueQuantity.system in entry[{i}] must be a string.")
                    if "code" in vq and not isinstance(vq.get("code"), str):
                        errors.append(f"Observation.valueQuantity.code in entry[{i}] must be a string.")

            if "referenceRange" in res and not isinstance(res.get("referenceRange"), list):
                errors.append(f"Observation.referenceRange in entry[{i}] must be an array.")

    if obs_count < min_observations:
        errors.append(
            f"Bundle must include at least {min_observations} Observation resources (found {obs_count})."
        )
    return errors


def sanitize_bundle(bundle: Dict[str, Any]) -> Dict[str, Any]:
    allowed_gender = {"male", "female", "other", "unknown"}
    strict_placeholders = os.getenv("medGemma_strict_placeholders", "1").strip().lower() in {"1", "true", "yes"}
    allow_vq_codes = os.getenv("medGemma_allow_vq_codes", "0").strip().lower() in {"1", "true", "yes"}
    allow_vq_comparator = os.getenv("medGemma_allow_vq_comparator", "0").strip().lower() in {"1", "true", "yes"}

    if not isinstance(bundle, dict):
        return {"resourceType": "Bundle", "type": "collection", "entry": []}

    bundle.setdefault("resourceType", "Bundle")
    bundle.setdefault("type", "collection")

    entry = bundle.get("entry")
    if not isinstance(entry, list):
        entry = []
    new_entry: List[Dict[str, Any]] = []

    for item in entry:
        if not isinstance(item, dict):
            continue
        res = item.get("resource")
        if not isinstance(res, dict):
            continue
        rtype = res.get("resourceType")
        if rtype not in {"Patient", "Observation", "MedicationRequest"}:
            continue

        res.pop("meta", None)

        if rtype == "Patient":
            res.setdefault("id", "patient-1")
            if "gender" in res:
                gender = str(res.get("gender", "")).lower()
                if gender in allowed_gender:
                    res["gender"] = gender
                else:
                    res.pop("gender", None)
            names = res.get("name")
            if isinstance(names, list):
                cleaned_names = []
                for n in names:
                    if not isinstance(n, dict):
                        continue
                    given = n.get("given")
                    if isinstance(given, str):
                        n["given"] = [given]
                    if strict_placeholders:
                        family = str(n.get("family", "")).strip().lower()
                        given_list = n.get("given") if isinstance(n.get("given"), list) else []
                        given_list = [str(g).strip().lower() for g in given_list]
                        if family == "doe" and any(g in {"john", "jane"} for g in given_list):
                            continue
                    cleaned_names.append(n)
                if cleaned_names:
                    res["name"] = cleaned_names
                else:
                    res.pop("name", None)

        if rtype == "Observation":
            subject = res.get("subject")
            if not isinstance(subject, dict):
                subject = {}
            subject.setdefault("reference", "Patient/patient-1")
            res["subject"] = subject

            code = res.get("code")
            if isinstance(code, str):
                res["code"] = {"text": code}

            vq = res.get("valueQuantity")
            if isinstance(vq, dict):
                if isinstance(vq.get("code"), dict):
                    vq.pop("code", None)
                if not allow_vq_codes:
                    vq.pop("system", None)
                    vq.pop("code", None)
                else:
                    if "system" in vq and not isinstance(vq.get("system"), str):
                        vq.pop("system", None)
                    if "code" in vq and not isinstance(vq.get("code"), str):
                        vq.pop("code", None)
                if not allow_vq_comparator:
                    vq.pop("comparator", None)
            elif vq is not None:
                res.pop("valueQuantity", None)

            if "referenceRange" in res and not isinstance(res.get("referenceRange"), list):
                res.pop("referenceRange", None)

        if rtype == "MedicationRequest":
            subject = res.get("subject")
            if not isinstance(subject, dict):
                subject = {}
            subject.setdefault("reference", "Patient/patient-1")
            res["subject"] = subject

        new_entry.append({"resource": res})

    bundle["entry"] = new_entry
    return bundle


def bundle_from_extraction(extraction: Dict[str, Any]) -> Dict[str, Any]:
    patient = extraction.get("patient", {})
    observations = extraction.get("observations", [])
    report_date = extraction.get("report_date")

    bundle = {"resourceType": "Bundle", "type": "collection", "entry": []}

    patient_resource = {"resourceType": "Patient", "id": "patient-1"}
    for field in ["gender", "birthDate", "identifier"]:
        if field in patient:
            if field == "birthDate" and not normalize_date(patient.get(field)):
                continue
            if field == "identifier" and isinstance(patient.get(field), str):
                patient_resource["identifier"] = [{"value": patient.get(field)}]
            else:
                patient_resource[field] = patient[field]
    name = patient.get("name")
    if isinstance(name, dict):
        patient_resource["name"] = [name]
    bundle["entry"].append({"resource": patient_resource})

    # LOINC Knowledge Base for "Perfect" FHIR JSON
    LOINC_MAPPING = {
        "haemoglobin": "718-7",
        "hemoglobin": "718-7",
        "total wbc count": "6690-2",
        "wbc count": "6690-2",
        "total rbc count": "789-8",
        "rbc count": "789-8",
        "platelet count": "777-3",
        "haematocrit": "4544-3",
        "hematocrit": "4544-3",
        "hct": "4544-3",
        "pcv": "4544-3",
        "mcv": "787-2",
        "mch": "785-6",
        "mchc": "786-4",
        "rdw": "14563-1",
        "neutrophils": "770-8",
        "lymphocytes": "731-0",
        "monocytes": "742-7",
        "eosinophils": "711-2",
        "basophils": "704-7"
    }

    compute_flags = os.getenv("medGemma_compute_flags", "1").strip().lower() in {"1", "true", "yes"}
    for idx, o in enumerate(observations, start=1):
        name = o.get("name", "")
        clean_name = name.lower().strip()
        loinc_code = LOINC_MAPPING.get(clean_name)
        
        obs = {
            "resourceType": "Observation",
            "id": f"obs-{idx}",
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "laboratory",
                            "display": "Laboratory"
                        }
                    ]
                }
            ],
            "code": {
                "text": name,
                "coding": []
            },
            "subject": {"reference": "Patient/patient-1"},
        }

        if loinc_code:
            obs["code"]["coding"].append({
                "system": "http://loinc.org",
                "code": loinc_code,
                "display": name
            })

        val = o.get("value")
        # FHIR PERFECTION: valueQuantity MUST be a number. Use valueString for text like "Verified"
        if isinstance(val, (int, float)):
            obs["valueQuantity"] = {"value": val}
            if o.get("unit"):
                obs["valueQuantity"]["unit"] = normalize_unit(o.get("unit"))
        else:
            obs["valueString"] = str(val)

        if report_date:
            obs["effectiveDateTime"] = report_date
        ref_low = o.get("ref_low")
        ref_high = o.get("ref_high")
        if ref_low is not None or ref_high is not None:
            rr: Dict[str, Any] = {}
            if ref_low is not None:
                low_parts = split_value_unit(ref_low)
                rr["low"] = {"value": low_parts.get("value", ref_low)}
                if o.get("unit"):
                    rr["low"]["unit"] = normalize_unit(o.get("unit"))
                elif low_parts.get("unit"):
                    rr["low"]["unit"] = normalize_unit(low_parts.get("unit"))
            if ref_high is not None:
                high_parts = split_value_unit(ref_high)
                rr["high"] = {"value": high_parts.get("value", ref_high)}
                if o.get("unit"):
                    rr["high"]["unit"] = normalize_unit(o.get("unit"))
                elif high_parts.get("unit"):
                    rr["high"]["unit"] = normalize_unit(high_parts.get("unit"))
            obs["referenceRange"] = [rr]
        if o.get("flag") in {"H", "L"}:
            obs["interpretation"] = [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": o.get("flag"),
                        }
                    ]
                }
            ]
        elif compute_flags:
            val = o.get("value")
            low = o.get("ref_low")
            high = o.get("ref_high")
            try:
                if isinstance(val, (int, float)) and isinstance(low, (int, float)) and val < low:
                    obs["interpretation"] = [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                    "code": "L",
                                }
                            ]
                        }
                    ]
                if isinstance(val, (int, float)) and isinstance(high, (int, float)) and val > high:
                    obs["interpretation"] = [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                    "code": "H",
                                }
                            ]
                        }
                    ]
            except Exception:
                pass
        bundle["entry"].append({"resource": obs})

    return bundle


def ensure_interpretation_from_range(bundle: Dict[str, Any]) -> None:
    if not isinstance(bundle, dict):
        return
    entries = bundle.get("entry")
    if not isinstance(entries, list):
        return
    for entry in entries:
        res = entry.get("resource") if isinstance(entry, dict) else None
        if not isinstance(res, dict):
            continue
        if res.get("resourceType") != "Observation":
            continue
        if res.get("interpretation"):
            continue
        vq = res.get("valueQuantity", {})
        if not isinstance(vq, dict):
            continue
        val = vq.get("value")
        rr = res.get("referenceRange")
        if not isinstance(rr, list) or not rr:
            continue
        low = rr[0].get("low", {}).get("value") if isinstance(rr[0], dict) else None
        high = rr[0].get("high", {}).get("value") if isinstance(rr[0], dict) else None
        if isinstance(val, (int, float)) and isinstance(low, (int, float)) and val < low:
            res["interpretation"] = [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": "L",
                        }
                    ]
                }
            ]
        if isinstance(val, (int, float)) and isinstance(high, (int, float)) and val > high:
            res["interpretation"] = [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": "H",
                        }
                    ]
                }
            ]
