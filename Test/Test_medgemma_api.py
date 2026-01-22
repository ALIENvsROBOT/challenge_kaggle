import os
import requests
from dotenv import load_dotenv

# Load environment variables from the .env file in the parent directory
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
dotenv_path = os.path.join(parent_dir, '.env')
load_dotenv(dotenv_path)

def medGemma(message):
    """
    Sends a message to the MedGemma API and returns the cleaned content.
    Removes 'thinking' model output enclosed in tags if present.
    """
    # Get configurations from environment variables
    api_key = os.getenv("medGemma_api_key")
    base_url = os.getenv("medGemma_endpoint")

    if not api_key or not base_url:
        raise ValueError("medGemma_api_key or medGemma_endpoint not found in .env file")

    # Construct the full URL
    url = f"{base_url}/api/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "google/medgemma-1.5-4b-it",
        "messages": [
            {
                "role": "user",
                "content": message
            }
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        json_response = response.json()
        content = json_response['choices'][0]['message']['content']
        
        # Clean logic: remove everything before and including <unused95> if it exists
        if '<unused95>' in content:
            # Check if <unused94> is also there just to be sure we are in the right mode,
            # but user instruction was specific about returning string AFTER <unused95>.
            # We will split by the LAST occurrence or FIRST? 
            # Usually strict thinking block is at the start.
            parts = content.split('<unused95>', 1)
            if len(parts) > 1:
                return parts[1].strip()
        
        return content.strip()

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print("Response content:", e.response.text)
        return None
    except KeyError as e:
        print(f"Unexpected response structure: {e}")
        return None

if __name__ == "__main__":
    user_message = "Why is the sky blue?"
    response_content = medGemma(user_message)
    if response_content:
        print("Cleaned Response:")
        print(response_content)
