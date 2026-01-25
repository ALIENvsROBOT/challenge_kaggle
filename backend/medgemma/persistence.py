
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
            "SELECT id, patient_id, original_filename, created_at, status FROM submissions ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
        rows = cur.fetchall()
        submissions = []
        for row in rows:
            submissions.append({
                "id": str(row[0]),
                "patient_id": row[1],
                "filename": row[2],
                "created_at": row[3].isoformat(),
                "status": row[4]
            })
        cur.close()
        conn.close()
        return submissions
    except Exception as e:
        logger.error(f"Failed to fetch submissions: {e}")
        return []
