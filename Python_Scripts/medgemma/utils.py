"""
Utility Functions Module

This module contains stateless helper functions for text parsing, unit normalization,
and string cleanup.

Key Functions:
- `normalize_unit`: Standardizes varied unit strings (e.g. "mill/cumm", "mill/mm3") into a canonical format.
- `infer_unit_by_name`: Provides a "Knowledge Base" of expected units for common CBC tests.
- `split_value_unit`: Regex-based parser to separate "12.5 g/dL" into {"value": 12.5, "unit": "g/dL"}.
"""
from typing import Any, Dict, Optional


def extract_json_candidate(text: str) -> str:
    cleaned = text.strip()
    start = cleaned.find("{")
    if start == -1:
        return cleaned
    depth = 0
    for i, ch in enumerate(cleaned[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return cleaned[start:i + 1]
    return cleaned[start:]


def to_number(value: Any) -> Any:
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        v = value.strip().replace(",", "")
        try:
            return float(v)
        except ValueError:
            return value.strip()
    return value


def normalize_unit(unit: Optional[str]) -> Optional[str]:
    if not isinstance(unit, str):
        return None
    u = unit.strip()
    if not u:
        return None
    u = u.replace("[H]", "").replace("[L]", "").replace("[ ]", "").strip()
    u = u.replace("µ", "u")
    u = u.replace("UL", "uL").replace("ul", "uL")
    if u.lower() in {"gm/dl", "g/dl"}:
        return "g/dL"
    if u.lower() in {"pg"}:
        return "pg"
    if u.lower() in {"fl"}:
        return "fL"
    if u.lower() in {"%"}:
        return "%"
    if u.lower() in {"mill/mm3", "mill/mm³", "mill/cumm", "mill/cmm", "million/mm3", "million/mm³", "million/cumm"}:
        return "mill/cmm"
    return u


def normalize_name(name: str) -> str:
    n = name.strip()
    n = n.replace("M.C.H.2c", "M.C.H.C.")
    n = n.replace("IMPATURE", "IMMATURE")
    n = n.lstrip("(*)# ").strip()
    return n


def split_value_unit(text: Any) -> Dict[str, Any]:
    if isinstance(text, (int, float)):
        return {"value": text}
    if not isinstance(text, str):
        return {}
    import re
    t = text.strip()
    if not t:
        return {}
    flag = None
    if "[H]" in t:
        flag = "H"
        t = t.replace("[H]", "").strip()
    if "[L]" in t:
        flag = "L"
        t = t.replace("[L]", "").strip()
    t = t.replace("³", "3")
    m = re.match(r"^([-+]?\d+(?:\.\d+)?)\s*([^\d]*)$", t)
    if not m:
        return {"value": to_number(t), "flag": flag}
    val = to_number(m.group(1))
    unit = m.group(2).strip() if m.group(2) else None
    out = {"value": val}
    if unit:
        out["unit"] = unit
    if flag:
        out["flag"] = flag
    return out


def infer_unit_by_name(name: str) -> Optional[str]:
    n = name.lower()
    if "haemoglobin" in n or "hemoglobin" in n:
        return "g/dL"
    if "r.b.c" in n or "rbc" in n or "red blood" in n:
        return "mill/cmm"
    if "haematocrit" in n or "hct" in n or "pcv" in n:
        return "%"
    if "mcv" in n:
        return "fL"
    if "mchc" in n:
        return "g/dL"
    if "mch" in n:
        return "pg"
    if "rdw" in n:
        return "%"
    if "w.b.c" in n or "wbc" in n or "leukocyte" in n:
        return "/uL"
    if "abs" in n and any(k in n for k in ["neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils"]):
        return "/uL"
    if "neutrophils" in n or "lymphocytes" in n or "monocytes" in n or "eosinophils" in n or "basophils" in n:
        return "%"
    if "platelet" in n and "mpv" not in n and "fraction" not in n:
        return "/uL"
    if "mpv" in n:
        return "fL"
    if "immature platelet fraction" in n:
        return "%"
    return None


def normalize_date(value: Optional[str]) -> Optional[str]:
    if not isinstance(value, str):
        return None
    v = value.strip()
    if not v:
        return None
    if "-" in v and len(v.split("-")[0]) == 4:
        return v
    return None
