from typing import Any, Dict

FHIR_BUNDLE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["resourceType", "type", "entry"],
    "properties": {
        "resourceType": {"const": "Bundle"},
        "type": {"const": "collection"},
        "id": {"type": "string"},
        "timestamp": {"type": "string"},
        "entry": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["resource"],
                "properties": {
                    "resource": {
                        "oneOf": [
                            {
                                "type": "object",
                                "required": ["resourceType", "id"],
                                "properties": {
                                    "resourceType": {"const": "Patient"},
                                    "id": {"type": "string"},
                                    "identifier": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "use": {"type": "string"},
                                                "system": {"type": "string"},
                                                "value": {"type": "string"},
                                            },
                                            "additionalProperties": False,
                                        },
                                    },
                                    "name": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "text": {"type": "string"},
                                                "family": {"type": "string"},
                                                "given": {"type": "array", "items": {"type": "string"}},
                                            },
                                            "additionalProperties": False,
                                        },
                                    },
                                    "birthDate": {"type": "string"},
                                    "gender": {
                                        "type": "string",
                                        "enum": ["male", "female", "other", "unknown"],
                                    },
                                },
                                "additionalProperties": False,
                            },
                            {
                                "type": "object",
                                "required": ["resourceType", "id", "status", "code", "subject"],
                                "properties": {
                                    "resourceType": {"const": "Observation"},
                                    "id": {"type": "string"},
                                    "status": {"type": "string"},
                                    "category": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "coding": {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "system": {"type": "string"},
                                                            "code": {"type": "string"},
                                                            "display": {"type": "string"},
                                                        },
                                                        "additionalProperties": False,
                                                    },
                                                },
                                                "text": {"type": "string"},
                                            },
                                            "additionalProperties": False,
                                        },
                                    },
                                    "code": {
                                        "type": "object",
                                        "properties": {
                                            "coding": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "system": {"type": "string"},
                                                        "code": {"type": "string"},
                                                        "display": {"type": "string"},
                                                    },
                                                    "additionalProperties": False,
                                                },
                                            },
                                            "text": {"type": "string"},
                                        },
                                        "additionalProperties": False,
                                    },
                                    "subject": {
                                        "type": "object",
                                        "required": ["reference"],
                                        "properties": {
                                            "reference": {"type": "string"},
                                        },
                                        "additionalProperties": False,
                                    },
                                    "effectiveDateTime": {"type": "string"},
                                    "valueQuantity": {
                                        "type": "object",
                                        "properties": {
                                            "value": {"type": ["number", "string"]},
                                            "comparator": {"type": "string"},
                                            "unit": {"type": "string"},
                                            "system": {"type": "string"},
                                            "code": {"type": "string"},
                                        },
                                        "additionalProperties": False,
                                    },
                                    "referenceRange": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "low": {
                                                    "type": "object",
                                                    "properties": {
                                                        "value": {"type": ["number", "string"]},
                                                        "unit": {"type": "string"},
                                                        "system": {"type": "string"},
                                                        "code": {"type": "string"},
                                                    },
                                                    "additionalProperties": False,
                                                },
                                                "high": {
                                                    "type": "object",
                                                    "properties": {
                                                        "value": {"type": ["number", "string"]},
                                                        "unit": {"type": "string"},
                                                        "system": {"type": "string"},
                                                        "code": {"type": "string"},
                                                    },
                                                    "additionalProperties": False,
                                                },
                                                "text": {"type": "string"},
                                            },
                                            "additionalProperties": False,
                                        },
                                    },
                                },
                                "additionalProperties": False,
                            },
                            {
                                "type": "object",
                                "required": ["resourceType", "id", "intent", "subject", "medicationCodeableConcept"],
                                "properties": {
                                    "resourceType": {"const": "MedicationRequest"},
                                    "id": {"type": "string"},
                                    "status": {"type": "string"},
                                    "intent": {"type": "string"},
                                    "subject": {
                                        "type": "object",
                                        "required": ["reference"],
                                        "properties": {"reference": {"type": "string"}},
                                        "additionalProperties": False,
                                    },
                                    "authoredOn": {"type": "string"},
                                    "medicationCodeableConcept": {
                                        "type": "object",
                                        "properties": {
                                            "coding": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "system": {"type": "string"},
                                                        "code": {"type": "string"},
                                                        "display": {"type": "string"},
                                                    },
                                                    "additionalProperties": False,
                                                },
                                            },
                                            "text": {"type": "string"},
                                        },
                                        "additionalProperties": False,
                                    },
                                    "dosageInstruction": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {"text": {"type": "string"}},
                                            "additionalProperties": True,
                                        },
                                    },
                                },
                                "additionalProperties": False,
                            },
                        ]
                    }
                },
                "additionalProperties": False,
            },
        },
    },
    "additionalProperties": False,
}
