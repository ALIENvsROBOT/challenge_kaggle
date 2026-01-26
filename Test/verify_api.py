import requests
import sys
import json
import time

BASE_URL = "http://localhost:8000/api/v1"
API_KEY = "sk-" + "a" * 40  # Dummy valid key
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def log(msg):
    print(f"[TEST] {msg}")

def test_api():
    log("Starting API Verification...")

    # 1. Fetch Submissions
    log("Fetching submissions...")
    try:
        resp = requests.get(f"{BASE_URL}/submissions?limit=5", headers=HEADERS)
        resp.raise_for_status()
        submissions = resp.json()
    except Exception as e:
        log(f"FAILED to fetch submissions: {e}")
        return

    if not submissions:
        log("No submissions found.")
        return

    target_sub = submissions[0]
    sub_id = target_sub.get('id')
    log(f"Target Submission ID: {sub_id}")
    
    # 2. Trigger Rerun
    log(f"Triggering Smart Rerun...")
    try:
        start_t = time.time()
        resp = requests.post(f"{BASE_URL}/rerun/{sub_id}", headers=HEADERS)
        resp.raise_for_status()
        rerun_data = resp.json()
        duration = time.time() - start_t
        
        log(f"Rerun Success ({duration:.2f}s). Checking content...")
        
        fhir = rerun_data.get("fhir_bundle", {})
        entries = fhir.get("entry", [])
        
        found_obs = []
        for e in entries:
            res = e.get("resource", {})
            if res.get("resourceType") == "Observation":
                code_text = res.get("code", {}).get("text", "Unknown")
                val = res.get("valueQuantity", {}).get("value", "N/A")
                unit = res.get("valueQuantity", {}).get("unit", "")
                found_obs.append(f"{code_text}: {val} {unit}")
        
        log(f"Found Observations: {json.dumps(found_obs, indent=2)}")
        
        # Check for Procalcitonin (Success) vs Haemoglobin (Fail)
        obs_str = " ".join(found_obs).lower()
        if "procalcitonin" in obs_str:
            log("SUCCESS: Procalcitonin found!")
        elif "haemoglobin" in obs_str:
            log("WARNING: Haemoglobin found (Possible Hallucination likely).")
        else:
             log("Note: Neither Procalcitonin nor Haemoglobin explicitly found.")

    except Exception as e:
         log(f"FAILED Rerun: {e}")
         # Print response text if available
         if hasattr(e, 'response') and e.response:
             log(f"Error Response: {e.response.text}")

if __name__ == "__main__":
    test_api()
