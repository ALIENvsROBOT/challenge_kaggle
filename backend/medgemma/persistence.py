
"""
MedGemma Persistence Layer
--------------------------
Handles all interactions with the PostgreSQL database and file system persistence.
Decouples data storage responsibilities from the API layer.
"""
import os
import logging
import psycopg2
from psycopg2.extras import Json
from typing import Dict, Any

# Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "medgemma_local")
DB_USER = os.getenv("POSTGRES_USER", "medgemma_user")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "dev_secret")

logger = logging.getLogger(__name__)

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to DB: {e}")
        raise e

def init_db():
    """Ensures the submissions table exists on startup."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id UUID PRIMARY KEY,
                patient_id VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                original_filename VARCHAR(255),
                file_path VARCHAR(255),
                fhir_bundle JSONB,
                status VARCHAR(50)
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Database initialized correctly.")
    except Exception as e:
        logger.error(f"Database Initialization Failed: {e}")

def save_submission(
    submission_id: str, 
    patient_id: str, 
    filename: str, 
    file_path: str, 
    fhir_bundle: Dict[str, Any]
) -> bool:
    """
    Persists a processed submission to the database.
    Returns True if successful, False otherwise.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO submissions (id, patient_id, original_filename, file_path, fhir_bundle, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (submission_id, patient_id, filename, file_path, Json(fhir_bundle), "completed")
        )
        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"Persisted submission {submission_id} to DB.")
        return True
    except Exception as e:
        logger.error(f"Database Write Failed: {e}")
        return False

def get_submissions(limit: int = 20) -> list:
    """Retrieves the most recent submissions."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, patient_id, original_filename, created_at, status, fhir_bundle, file_path FROM submissions ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
        rows = cur.fetchall()
        submissions = []
        for row in rows:
            # Construct accessible URL from file_path
            # Stored path: uploaded_files/filename.png -> Served at: /static/filename.png
            file_path = row[6]
            image_url = None
            if file_path:
                filename = os.path.basename(file_path)
                # Assume backend host is handled by proxy or absolute URL construction in frontend
                # For now returning relative path that matches the mounted static route
                image_url = f"http://localhost:8000/static/{filename}" 

            submissions.append({
                "id": str(row[0]),
                "patient_id": row[1],
                "filename": row[2],
                "created_at": row[3].isoformat(),
                "status": row[4],
                "fhir_bundle": row[5],
                "image_url": image_url
            })
        cur.close()
        conn.close()
        return submissions
    except Exception as e:
        logger.error(f"Failed to fetch submissions: {e}")
        return []

def get_submission(submission_id: str) -> Dict[str, Any]:
    """Retrieves a single submission by ID."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, patient_id, original_filename, file_path, fhir_bundle, status FROM submissions WHERE id = %s",
            (submission_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return {
                "id": str(row[0]),
                "patient_id": row[1],
                "filename": row[2],
                "file_path": row[3],
                "fhir_bundle": row[4],
                "status": row[5]
            }
        return None
    except Exception as e:
        logger.error(f"Failed to fetch submission {submission_id}: {e}")
        return None

def update_submission(submission_id: str, fhir_bundle: Dict[str, Any]) -> bool:
    """Updates the FHIR bundle for an existing submission."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE submissions SET fhir_bundle = %s, status = %s, created_at = CURRENT_TIMESTAMP WHERE id = %s",
            (Json(fhir_bundle), "completed", submission_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Failed to update submission {submission_id}: {e}")
        return False

def get_patients_directory() -> list:
    """
    Aggregates metrics per patient for the directory view.
    Returns: List of {patient_id, file_count, last_updated}
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        query = """
            SELECT 
                patient_id, 
                COUNT(*) as file_count, 
                MAX(created_at) as last_updated 
            FROM submissions 
            GROUP BY patient_id 
            ORDER BY last_updated DESC
        """
        cur.execute(query)
        rows = cur.fetchall()
        
        directory = []
        for row in rows:
            directory.append({
                "patient_id": row[0],
                "file_count": row[1],
                "last_updated": row[2].isoformat() if row[2] else None
            })
            
        cur.close()
        conn.close()
        return directory
    except Exception as e:
        logger.error(f"Failed to fetch patient directory: {e}")
        return []

def get_patient_history(patient_id: str) -> list:
    """Retrieves all submissions for a specific patient, sorted by date."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, patient_id, original_filename, created_at, status, fhir_bundle, file_path 
            FROM submissions 
            WHERE patient_id = %s 
            ORDER BY created_at DESC
            """,
            (patient_id,)
        )
        rows = cur.fetchall()
        
        history = []
        for row in rows:
            # Reconstruct image URL logic (DRY violation but simple for now)
            file_path = row[6]
            image_url = None
            if file_path:
                filename = os.path.basename(file_path)
                image_url = f"http://localhost:8000/static/{filename}"

            history.append({
                "id": str(row[0]),
                "patient_id": row[1],
                "filename": row[2],
                "created_at": row[3].isoformat(),
                "status": row[4],
                "fhir_bundle": row[5],
                "image_url": image_url
            })
            
        cur.close()
        conn.close()
        return history
    except Exception as e:
        logger.error(f"Failed to fetch history for {patient_id}: {e}")
        return []
