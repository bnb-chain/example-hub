import re
import requests
import os
from dotenv import load_dotenv
from openai import OpenAI
from langdetect import detect
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


# Load environment variables from .env file
load_dotenv()
BSCSCAN_API_KEY = os.getenv("BSCSCAN_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)


def extract_evm_address(text):
    """Extract the first EVM address found in the user input."""
    match = re.search(r"0x[a-fA-F0-9]{40}", text)
    return match.group(0) if match else None


def get_abi_from_bscscan(address):
    """Fetch contract ABI from BscScan API."""
    url = "https://api.bscscan.com/api"
    params = {
        "module": "contract",
        "action": "getabi",
        "address": address,
        "apikey": BSCSCAN_API_KEY,
    }
    try:
        response = requests.get(url, params=params)
        result = response.json()
        if result.get("status") != "1":
            return None
        return result["result"]
    except Exception as e:
        print(f"Error while fetching ABI: {e}")
        return None


def analyze_abi_with_ai(abi_json, user_input):
    # Phát hiện ngôn ngữ đầu vào
    lang = detect(user_input)
    if lang.startswith("vi"):
        reply_language = "Trả lời bằng tiếng Việt."
    else:
        reply_language = "Respond in English."

    prompt = f"""You are a smart contract security expert.
Analyze the following smart contract ABI and identify any potential risks or malicious patterns.

Specifically, check for:
- Dangerous operations such as `delegatecall`, `selfdestruct`, or centralized access via `onlyOwner`.
- Any suspicious functions that may transfer or withdraw tokens or assets *without the explicit consent of the wallet owner* (e.g. `transferFrom` or hidden withdrawal logic).
- Potential backdoors or privilege escalation that allow unauthorized access to funds.

{reply_language}

Summarize your findings clearly and concisely.

ABI:
{abi_json}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a smart contract auditor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Failed to analyze ABI with AI: {str(e)}"


def main():
    print("Enter user message (containing EVM contract address):")
    user_input = input("> ")

    address = extract_evm_address(user_input)
    if not address:
        print("No EVM address found in input.")
        return

    print(f"Found address: {address}")
    abi = get_abi_from_bscscan(address)
    if not abi:
        print("Could not fetch ABI from BscScan.")
        return

    print("ABI fetched. Analyzing with AI...")
    result = analyze_abi_with_ai(abi, user_input)
    print("\n AI Risk Assessment:")
    print(result)


if __name__ == "__main__":
    main()
