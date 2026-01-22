"""
MedGemma API Client Module

This module provides a robust, optimized client for interacting with the MedGemma API.
It is designed for backend integration, featuring connection pooling, strict type hinting,
and configurable limits.

Typical Usage:
    client = MedGemmaClient()
    response = client.query("Describe this scan", image_path="scan.jpg")
"""

import base64
import logging
import mimetypes
import os
from pathlib import Path
from typing import Dict, List, Optional, Union, Any

import requests
from dotenv import load_dotenv

# Configure module-level logging
# In a real backend, the main app would likely configure the root logger.
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

class MedGemmaConfigError(Exception):
    """Raised when configuration is missing or invalid."""
    pass

class MedGemmaClient:
    """
    A high-performance client for the MedGemma Large Language Model API.
    
    Features:
    - Connection pooling via requests.Session
    - Automatic MIME type detection for images
    - Robust error handling and logging
    """

    DEFAULT_MODEL = "google/medgemma-1.5-4b-it"
    THINKING_TAG = "<unused95>"
    DEFAULT_TIMEOUT = 60  # seconds

    def __init__(
        self, 
        api_key: Optional[str] = None, 
        base_url: Optional[str] = None, 
        dotenv_path: Optional[Union[str, Path]] = None
    ) -> None:
        """
        Initialize the MedGemma client.

        Args:
            api_key: Optional explicit API Key. If None, valid env var is checked.
            base_url: Optional explicit Base URL. If None, valid env var is checked.
            dotenv_path: Optional path to .env file for loading configs.
        
        Raises:
            MedGemmaConfigError: If credentials cannot be resolved.
        """
        # Load environment context if needed
        self._load_env(dotenv_path)
        
        # specific args >> env vars
        self.api_key = api_key or os.getenv("medGemma_api_key")
        self.base_url = base_url or os.getenv("medGemma_endpoint")
        self.model = self.DEFAULT_MODEL

        if not self.api_key or not self.base_url:
            raise MedGemmaConfigError(
                "Missing configuration. Provide api_key/base_url or set "
                "'medGemma_api_key' / 'medGemma_endpoint' environment variables."
            )

        # Use a Session for connection pooling (Performance Optimization)
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        })

    def _load_env(self, specific_path: Optional[Union[str, Path]]) -> None:
        """Loads environment variables safely."""
        if specific_path:
            load_dotenv(specific_path)
        elif not os.getenv("medGemma_api_key"):
            # Only attempt auto-discovery if keys aren't already present
            current_file = Path(__file__).resolve()
            # Standard project structure assumption: .env is in project root (2 levels up)
            default_dotenv = current_file.parent.parent / '.env'
            load_dotenv(default_dotenv)

    def _encode_image(self, image_path: Path) -> str:
        """Reads and encodes an image file to Base64."""
        try:
            with image_path.open("rb") as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except OSError as e:
            logger.error(f"Failed to read image at {image_path}: {e}")
            raise

    def close(self):
        """Closes the underlying network session."""
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def query(
        self, 
        message: str, 
        image_path: Optional[Union[str, Path]] = None,
        timeout: int = DEFAULT_TIMEOUT
    ) -> Optional[str]:
        """
        Sends a query to the MedGemma model.

        Args:
            message: The text prompt for the model.
            image_path: Optional path to an image file.
            timeout: Request timeout in seconds.

        Returns:
            The cleaned string response from the model, or None if failed.
        """
        url = f"{self.base_url}/api/chat/completions"
        path_obj = Path(image_path) if image_path else None

        # Validation
        if path_obj and not path_obj.exists():
            logger.warning(f"Image not found at {path_obj}. Falling back to text-only.")
            path_obj = None

        # Payload Construction
        try:
            if path_obj:
                content = self._build_multimodal_content(message, path_obj)
            else:
                content = message
        except OSError:
            return None

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": content}]
        }

        try:
            logger.debug(f"POST {url} | Model: {self.model}")
            
            response = self.session.post(url, json=payload, timeout=timeout)
            response.raise_for_status()

            data = response.json()
            raw_content = data['choices'][0]['message']['content']
            
            return self._clean_response(raw_content)

        except requests.exceptions.Timeout:
            logger.error(f"Request timed out after {timeout} seconds.")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"API Request failed: {e}")
            if e.response:
                logger.error(f"Server Response: {e.response.text}")
            return None
        except (KeyError, IndexError) as e:
            logger.error(f"Malformed API response: {e}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return None

    def _build_multimodal_content(self, text: str, image_path: Path) -> List[Dict[str, Any]]:
        """Helper to construct the multimodal message payload."""
        logger.info(f"Encoding image: {image_path.name}")
        encoded_image = self._encode_image(image_path)
        
        mime_type, _ = mimetypes.guess_type(image_path)
        mime_type = mime_type or 'image/jpeg'

        return [
            {"type": "text", "text": text},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}
            }
        ]

    def _clean_response(self, content: str) -> str:
        """Removes internal model 'thinking' artifacts from the response."""
        if self.THINKING_TAG in content:
            parts = content.split(self.THINKING_TAG, 1)
            if len(parts) > 1:
                return parts[1].strip()
        return content.strip()


def main():
    """Manual testing entry point."""
    try:
        # Context manager handles session cleanup automatically
        with MedGemmaClient() as client:
            user_query = "What is in this image?"
            
            # Smart path resolution for testing
            script_dir = Path(__file__).resolve().parent
            test_image = script_dir / "test.jpg"

            logger.info("--- Starting MedGemma Client Test ---")
            
            response = client.query(user_query, image_path=test_image)

            if response:
                print("\n=== Model Response ===")
                print(response)
                print("======================\n")
            else:
                logger.error("No valid response received.")

    except MedGemmaConfigError as e:
        logger.critical(f"Configuration Error: {e}")

if __name__ == "__main__":
    main()
