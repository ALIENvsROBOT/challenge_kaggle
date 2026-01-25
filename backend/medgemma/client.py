"""
MedGemma API Client Module

This module provides a robust, production-ready HTTP client for interacting with the
MedGemma model (served via vLLM or OpenAI-compatible endpoints).

Key Features:
1. **Multimodal Support:** Automatically handles image encoding (Base64) and MIME type detection.
2. **Resilience:** Implements connection pooling (via `requests.Session`) and error handling.
3. **Flexibility:** Supports dynamic system prompts, structured output schemas, and custom timeouts.
4. **Environment Management:** Automatically loads configuration from `.env` files in parent directories.
"""
import base64
import json
import logging
import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class MedGemmaConfigError(Exception):
    """Raised when configuration is missing or invalid."""


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
    DEFAULT_TIMEOUT = 500  # seconds
    DEFAULT_MAX_TOKENS = 2500

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        dotenv_path: Optional[Union[str, Path]] = None,
    ) -> None:
        self._load_env(dotenv_path)

        self.api_key = api_key or os.getenv("medGemma_api_key")
        self.base_url = base_url or os.getenv("medGemma_endpoint")
        self.model = os.getenv("medGemma_model") or self.DEFAULT_MODEL

        if not self.api_key or not self.base_url:
            raise MedGemmaConfigError(
                "Missing configuration. Provide api_key/base_url or set "
                "'medGemma_api_key' / 'medGemma_endpoint' environment variables."
            )

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def _load_env(self, specific_path: Optional[Union[str, Path]]) -> None:
        if specific_path:
            load_dotenv(specific_path)
        elif not os.getenv("medGemma_api_key"):
            current_file = Path(__file__).resolve()
            search_roots = [
                current_file.parent,
                current_file.parent.parent,
                current_file.parent.parent.parent,
            ]
            for root in search_roots:
                candidate = root / ".env"
                if candidate.exists():
                    load_dotenv(candidate)
                    break

    def _encode_image(self, image_path: Path) -> str:
        try:
            with image_path.open("rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        except OSError as e:
            logger.error(f"Failed to read image at {image_path}: {e}")
            raise

    def close(self) -> None:
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def query(
        self,
        message: str,
        image_path: Optional[Union[str, Path]] = None,
        timeout: int = DEFAULT_TIMEOUT,
        system_prompt: Optional[str] = None,
        structured_schema: Optional[Dict[str, Any]] = None,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        url = self._build_chat_url(self.base_url)
        path_obj = Path(image_path) if image_path else None

        if path_obj and not path_obj.exists():
            logger.warning(f"Image not found at {path_obj}. Falling back to text-only.")
            path_obj = None

        try:
            if path_obj:
                content = self._build_multimodal_content(message, path_obj)
            else:
                content = message
        except OSError:
            return None

        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": content})

        max_tokens = int(os.getenv("medGemma_max_tokens", str(self.DEFAULT_MAX_TOKENS)))
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0,
        }
        if structured_schema:
            payload["structured_outputs"] = {"json": structured_schema}
        if response_format:
            payload["response_format"] = response_format

        try:
            logger.debug(f"POST {url} | Model: {self.model}")
            response = self.session.post(url, json=payload, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            raw_content = data["choices"][0]["message"]["content"]
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
        logger.info(f"Encoding image: {image_path.name}")
        encoded_image = self._encode_image(image_path)
        mime_type, _ = mimetypes.guess_type(image_path)
        mime_type = mime_type or "image/jpeg"

        return [
            {"type": "text", "text": text},
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}},
        ]

    def _build_chat_url(self, base_url: str) -> str:
        base = base_url.rstrip("/")
        if base.endswith("/v1/chat/completions") or base.endswith("/api/v1/chat/completions"):
            return base
        if base.endswith("/chat/completions"):
            return base
        if base.endswith("/v1") or base.endswith("/api/v1"):
            return f"{base}/chat/completions"
        return f"{base}/v1/chat/completions"

    def _clean_response(self, content: str) -> str:
        content = self._exclude_thinking_component(content)
        content = self._strip_json_decoration(content)
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1:
            content = content[start : end + 1]
        try:
            return json.dumps(json.loads(content), separators=(",", ":"))
        except Exception:
            return content.strip()

    def _exclude_thinking_component(self, text: str) -> str:
        import re
        return re.sub(r"<unused94>.*?<unused95>", "", text, flags=re.DOTALL).strip()

    def _strip_json_decoration(self, text: str) -> str:
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            return cleaned[7:-3].strip()
        if cleaned.startswith("```"):
            return cleaned[3:-3].strip()
        return cleaned
