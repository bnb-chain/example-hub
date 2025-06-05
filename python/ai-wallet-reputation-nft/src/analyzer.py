import os
import logging
from web3 import Web3
from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware # Correct import for v6+
from web3.exceptions import InvalidAddress
from dotenv import load_dotenv
import openai # Still use the openai library, but configured for OpenRouter

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RPC_URL = os.getenv("RPC_URL")
if not RPC_URL:
    raise ValueError("RPC_URL environment variable not set.")

# Updated: Load OpenRouter API Key and configure client
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    logger.warning("OPENROUTER_API_KEY environment variable not set. LLM Rationale generation will be skipped.")
    openai_client = None
else:
    try:
        # Configure the OpenAI client to use OpenRouter endpoint and API key
        openai_client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            # Optional: Add headers for OpenRouter ranking (if running on a public site)
            # default_headers={
            #     "HTTP-Referer": "YOUR_SITE_URL", 
            #     "X-Title": "YOUR_SITE_NAME",
            # },
        )
        logger.info("OpenAI client initialized for OpenRouter.")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client for OpenRouter: {e}", exc_info=True)
        openai_client = None

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# --- Reputation Scoring Parameters ---
# Read thresholds from .env or use defaults that match the new 5-tier system
THRESHOLD_EXPLORER = int(os.getenv("THRESHOLD_EXPLORER", 10))
THRESHOLD_CONTRIBUTOR = int(os.getenv("THRESHOLD_CONTRIBUTOR", 100))
THRESHOLD_VETERAN = int(os.getenv("THRESHOLD_VETERAN", 1000))
THRESHOLD_LEGEND = int(os.getenv("THRESHOLD_LEGEND", 10000))

# --- Reputation Scoring Configuration --- 
# These thresholds define the transaction count boundaries for each category.
# They can be adjusted in the .env file.
MIN_TX_COUNT_EXPLORER = int(os.getenv("MIN_TX_COUNT_EXPLORER", 10))
MIN_TX_COUNT_CONTRIBUTOR = int(os.getenv("MIN_TX_COUNT_CONTRIBUTOR", 50))
MIN_TX_COUNT_VETERAN = int(os.getenv("MIN_TX_COUNT_VETERAN", 200))
MIN_TX_COUNT_LEGEND = int(os.getenv("MIN_TX_COUNT_LEGEND", 1000))

# Define reputation categories and corresponding scores (out of 100)
# Scores are somewhat arbitrary for this demo.
REPUTATION_LEVELS = {
    "Newcomer": 10, # Score < 20
    "Explorer": 30, # Score 20-49
    "Contributor": 60, # Score 50-79
    "Veteran": 85, # Score 80-94
    "Legend": 95, # Score >= 95
}

# --- Web3 Connection --- 
def get_web3_connection():
    """Establishes and returns a connection to the blockchain via RPC_URL."""
    if not RPC_URL:
        logging.error("Cannot establish Web3 connection: RPC_URL is not configured.")
        return None
        
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    # Inject PoA middleware if potentially needed (common for BSC/Polygon testnets)
    # This handles the extraData field in blocks from PoA chains.
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    
    if not w3.is_connected():
        logging.error(f"Failed to connect to Web3 provider at {RPC_URL}")
        return None
    
    logging.info(f"Successfully connected to Web3 provider. Chain ID: {w3.eth.chain_id}")
    return w3

# Initialize Web3 connection globally (or manage within requests)
# For a simple demo, a global connection is acceptable.
# For production, consider connection pooling or request-scoped connections.
w3_connection = get_web3_connection()

# --- LLM Rationale Generation (Using OpenRouter) ---
def generate_rationale_with_llm(category: str, tx_count: int, address: str) -> str:
    """Generates a brief explanation for the reputation category using OpenRouter."""
    if not openai_client:
        logger.info("Skipping LLM rationale generation as OpenRouter client is not available.")
        return "LLM rationale generation is currently unavailable."

    prompt_message = f"""
    A user's BNB Chain address ({address}) has been analyzed.
    Based on their transaction count of {tx_count}, they have been assigned the reputation category: '{category}'.

    Please provide a very brief (1-2 sentences), encouraging, and user-friendly explanation for why they received this category, suitable for displaying directly in a web app.
    Focus on the positive aspects of their activity level implied by the category.
    Avoid technical jargon where possible. Do not mention the specific transaction count unless it's essential for context (e.g., for Newcomer).
    Examples:
    - If Newcomer: "Welcome! This badge shows you're just starting your journey on the BNB Chain."
    - If Explorer: "You're actively exploring the possibilities of the BNB Chain! Keep discovering."
    - If Contributor: "You're becoming a regular user, actively participating in the BNB Chain ecosystem."
    - If Veteran: "Your consistent activity demonstrates significant experience and engagement with the BNB Chain."
    - If Legend: "Wow! Your extensive history marks you as a highly experienced power user within the BNB Chain ecosystem."
    """

    try:
        logger.info(f"Requesting LLM rationale via OpenRouter for category '{category}', tx_count {tx_count}...")
        # Using a free model available on OpenRouter
        # model_name = "microsoft/mai-ds-r1:free" # As per user example, might be outdated?
        model_name = "microsoft/phi-3-mini-128k-instruct" # Using a more common free model
        
        response = openai_client.chat.completions.create(
            model=model_name, 
            messages=[
                {"role": "system", "content": "You are a helpful assistant providing brief, positive explanations for blockchain reputation categories."},
                {"role": "user", "content": prompt_message}
            ],
            max_tokens=60, # Slightly increased for potentially more verbose free models
            temperature=0.7, 
            n=1,
            stop=None,
        )
        rationale = response.choices[0].message.content.strip()
        logger.info(f"LLM Rationale received via OpenRouter: {rationale}")
        return rationale
    except Exception as e:
        logger.error(f"Error calling OpenRouter API: {e}", exc_info=True)
        return "Could not generate AI rationale via OpenRouter at this time."

# --- Reputation Analysis Logic --- 

def simulate_ai_reputation_score(tx_count: int, address: str) -> tuple[str, int, str, str]:
    """Calculates a reputation category and score based on transaction count,
    and generates an AI-powered rationale via OpenRouter."""
    
    # Determine category based on transaction count thresholds
    if tx_count < MIN_TX_COUNT_EXPLORER:
        category = "Newcomer"
    elif tx_count < MIN_TX_COUNT_CONTRIBUTOR:
        category = "Explorer"
    elif tx_count < MIN_TX_COUNT_VETERAN:
        category = "Contributor"
    elif tx_count < MIN_TX_COUNT_LEGEND:
        category = "Veteran"
    else:
        category = "Legend"
        
    # Get the base score for the category
    score = REPUTATION_LEVELS.get(category, 0) # Default to 0 if category somehow unknown
    
    # Simple message based on category
    message = f"Based on {tx_count} transactions, this address is categorized as a {category}."
    if category == "Newcomer":
        message += " Welcome to the chain!"
    elif category == "Legend":
        message += " A true DeFi degen!"
        
    # Simple scaling within category (example - could be more complex)
    # This adds a small bonus within the category range, maxing near the next threshold.
    if category == "Newcomer": 
        score = min(19, score + round(tx_count / MIN_TX_COUNT_EXPLORER * 9)) # Scale 0-9 -> 10-19
    elif category == "Explorer":
        score = min(49, score + round((tx_count - MIN_TX_COUNT_EXPLORER) / (MIN_TX_COUNT_CONTRIBUTOR - MIN_TX_COUNT_EXPLORER) * 19)) # Scale -> 30-49
    elif category == "Contributor":
        score = min(79, score + round((tx_count - MIN_TX_COUNT_CONTRIBUTOR) / (MIN_TX_COUNT_VETERAN - MIN_TX_COUNT_CONTRIBUTOR) * 19)) # Scale -> 60-79
    elif category == "Veteran":
        score = min(94, score + round((tx_count - MIN_TX_COUNT_VETERAN) / (MIN_TX_COUNT_LEGEND - MIN_TX_COUNT_VETERAN) * 9)) # Scale -> 85-94
    # Legend score stays at base 95+

    # Clamp score to 0-100 just in case
    score = max(0, min(100, score))
    
    # Generate rationale using LLM (now configured for OpenRouter)
    rationale = generate_rationale_with_llm(category, tx_count, address)

    logger.info(f"Address {address} with {tx_count} tx categorized as {category} with score {score}.")
    return category, score, message, rationale

def analyze_address_reputation(address: str) -> dict:
    """Analyzes an address to determine its reputation category, score, and rationale via OpenRouter."""
    if not w3_connection:
        logging.error("Analysis failed: No Web3 connection available.")
        return {"category": "Error", "score": 0, "message": "Error connecting to blockchain data.", "rationale": "", "details": {}}

    try:
        # Validate and checksum the address
        checksum_address = w3_connection.to_checksum_address(address)
        logging.info(f"Analyzing checksummed address: {checksum_address}")
    except InvalidAddress:
        logging.warning(f"Invalid address format received: {address}")
        return {"category": "Error", "score": 0, "message": f"Invalid address format: {address}", "rationale": "", "details": {"address": address}}
    except ValueError as e:
        # Catches potential errors if address is not hex
        logging.warning(f"Address validation error for {address}: {e}")
        return {"category": "Error", "score": 0, "message": f"Invalid address value: {address}", "rationale": "", "details": {"address": address}}

    try:
        # --- Fetch On-Chain Data --- 
        # Get transaction count (nonce)
        tx_count = w3_connection.eth.get_transaction_count(checksum_address)
        
        # Get balance (optional, for display)
        balance_wei = w3_connection.eth.get_balance(checksum_address)
        balance_bnb = w3_connection.from_wei(balance_wei, 'ether')
        
        logging.info(f"Data for {checksum_address}: Balance={balance_bnb:.4f} BNB, TxCount={tx_count}")
        
        # --- Calculate Reputation & Generate Rationale ---
        category, score, message, rationale = simulate_ai_reputation_score(tx_count, checksum_address)
        
        # --- Format Results --- 
        analysis_result = {
            "category": category,
            "score": score,
            "message": message,
            "rationale": rationale,
            "details": {
                "address": checksum_address,
                "transaction_count": tx_count,
                "balance_bnb": float(f"{balance_bnb:.6f}") # Format for JSON
                # Add more data points here in a real system (e.g., age, contract interactions)
            }
        }
        return analysis_result

    except Exception as e:
        # Catch potential network errors or other web3 issues
        logging.error(f"Error fetching data for address {checksum_address}: {e}", exc_info=True)
        return {
            "category": "Error", 
            "score": 0, 
            "message": "Error retrieving data from the blockchain.", 
            "rationale": "",
            "details": {"address": checksum_address}
        }

def is_valid_address(address: str) -> bool:
    """Checks if the given string is a valid BNB Chain address."""
    return Web3.is_address(address)

def get_account_data(address: str) -> dict | None:
    """Fetches basic data for a given address."""
    try:
        if not is_valid_address(address):
            logger.error(f"Invalid address format: {address}")
            return None
        
        checksum_address = Web3.to_checksum_address(address)
        balance_wei = w3.eth.get_balance(checksum_address)
        balance_bnb = w3.from_wei(balance_wei, 'ether')
        tx_count = w3.eth.get_transaction_count(checksum_address)

        # TODO: Add more sophisticated data fetching (e.g., contract interactions, token balances)
        # For now, we just use tx_count for scoring

        logger.info(f"Data for {address}: Balance={balance_bnb} BNB, TxCount={tx_count}")
        return {
            "address": address,
            "balance_bnb": float(balance_bnb),
            "transaction_count": tx_count
        }
    except InvalidAddress:
         logger.error(f"Invalid address provided: {address}")
         return None
    except Exception as e:
        logger.error(f"Error fetching data for {address}: {e}")
        return None

if __name__ == '__main__':
    # Example usage:
    test_addresses = [
        "0x988D8398B86C38406331b44F9413376647837489", # Example address (likely newcomer/explorer)
        "0xD81c6e09664D35f97F53A6E9732dae09CfB958a6", # Your previous example (44 tx -> Explorer)
        # Add addresses with higher tx counts if available for testing other tiers
    ]
    print("--- Analyzing Addresses ---")
    for test_address in test_addresses:
        if not is_valid_address(test_address):
            print(f"Skipping invalid address format: {test_address}")
            continue
        print(f"\nAnalyzing address: {test_address}")
        reputation_info = analyze_address_reputation(test_address)
        print("Reputation Analysis Result:")
        import json
        print(json.dumps(reputation_info, indent=2))
    print("\n--- Analysis Complete ---")
