import os
import json
import logging
import base64 # Needed for SVG encoding
import math # Needed for radiating lines calculation
from web3 import Web3
from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware # Correct import for v6+
from dotenv import load_dotenv
from web3.exceptions import ContractLogicError, TransactionNotFound
from eth_account import Account
from eth_account.signers.local import LocalAccount

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RPC_URL = os.getenv("RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
ABI_PATH = os.path.join(os.path.dirname(__file__), '..', 'contracts', 'ReputationBadge.abi.json')

if not RPC_URL or not PRIVATE_KEY or not CONTRACT_ADDRESS:
    raise ValueError("Missing required environment variables: RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS")

# --- Web3 Setup ---
w3 = Web3(Web3.HTTPProvider(RPC_URL))
# Add PoA middleware for chains like BSC Testnet/Mainnet, Polygon
# Use the correct middleware variable name
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

if not w3.is_connected():
    logger.critical(f"Failed to connect to Web3 provider at {RPC_URL}")
    raise ConnectionError(f"Failed to connect to Web3 provider at {RPC_URL}")
else:
    logger.info(f"Connected to Web3 provider. Chain ID: {w3.eth.chain_id}")

# Derive account from private key
try:
    minter_account: LocalAccount = Account.from_key(PRIVATE_KEY)
    minter_address = minter_account.address
    logger.info(f"Minter account loaded: {minter_address}")
except ValueError as e:
    logger.critical(f"Invalid PRIVATE_KEY format: {e}")
    raise ValueError(f"Invalid PRIVATE_KEY format: {e}")

# --- Contract Setup ---
try:
    checksum_contract_address = Web3.to_checksum_address(CONTRACT_ADDRESS)
    with open(ABI_PATH, 'r') as f:
        contract_abi = json.load(f)

    contract = w3.eth.contract(address=checksum_contract_address, abi=contract_abi)
    logger.info(f"Contract loaded at address: {checksum_contract_address}")

    # Optional: Basic check if contract code exists at address
    contract_code = w3.eth.get_code(checksum_contract_address)
    if contract_code == b'\x00' or contract_code == b'0x' or not contract_code:
        logger.warning(f"No contract code found at address {checksum_contract_address} on chain {w3.eth.chain_id}. Ensure it's deployed and the correct network is used.")
    else:
        logger.info(f"Contract code found at address {checksum_contract_address}.")

except FileNotFoundError:
    logger.critical(f"Contract ABI file not found at path: {ABI_PATH}. Place the ABI JSON file correctly.")
    # Depending on usage, might raise error or allow continuation with contract=None
except json.JSONDecodeError:
    logger.critical(f"Error decoding JSON from ABI file: {ABI_PATH}")
    # Raise or handle as needed
except Exception as e:
    logger.critical(f"An unexpected error occurred during contract setup: {e}", exc_info=True)
    # Raise or handle as needed

# --- SVG Generation Helper ---
def generate_badge_svg(category: str) -> str:
    """Generates an SVG badge with category-specific colors, initials, and star effects."""

    # --- Tier Style Definitions ---
    # (frame_color, star_color, initial, star_stroke_width)
    # Text color will now match frame_color
    tier_styles = {
        "Newcomer":   ("#607D8B", "#81D4FA", "N", 0),
        "Explorer":   ("#A1887F", "#4DB6AC", "E", 1),
        "Contributor":("#4CAF50", "#8BC34A", "C", 2),
        "Veteran":    ("#3F51B5", "#03A9F4", "V", 3),
        "Legend":     ("#FFC107", "#FFEB3B", "L", 4),
        "Unknown":    ("#455A64", "#78909C", "?", 0)
    }
    # Use 'Contributor' styles if old 'DeFi User' is passed unexpectedly
    if category == "DeFi User":
        category = "Contributor"
    # Use 'Legend' styles if old 'Power User' is passed unexpectedly
    if category == "Power User":
        category = "Legend"

    frame_color, star_color, initial, star_stroke_width = tier_styles.get(category, tier_styles["Unknown"])

    star_stroke_attr = f'stroke="{frame_color}" stroke-width="{star_stroke_width}"' if star_stroke_width > 0 else ""

    # --- Base SVG Template ---
    # Adjusted y-coordinate for better vertical centering of the initial
    svg_template = f'''<?xml version="1.0" encoding="iso-8859-1"?>
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 359.676 359.676" style="enable-background:new 0 0 359.676 359.676;" xml:space="preserve">
<g id="XMLID_1595_">
	<g id="XMLID_1596_">
		<path id="XMLID_1597_" style="fill:{frame_color};" d="M223.919,156.497h-88.164c-17.971,0-32.592-14.621-32.592-32.592V32.592
			C103.163,14.621,117.784,0,135.755,0h88.164c17.971,0,32.592,14.621,32.592,32.592v91.313
			C256.511,141.876,241.89,156.497,223.919,156.497z M135.755,20c-6.943,0-12.592,5.648-12.592,12.592v91.313
			c0,6.943,5.648,12.592,12.592,12.592h88.164c6.943,0,12.592-5.648,12.592-12.592V32.592c0-6.943-5.648-12.592-12.592-12.592
			H135.755z"/>
	</g>
	<!-- Text element for the initial -->
    <text x="179.8" y="80" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="70" font-weight="bold" fill="{frame_color}">
        {initial}
    </text>
	<g id="XMLID_1602_">
		<rect id="XMLID_1603_" x="169.837" y="137.91" style="fill:{frame_color};" width="20" height="94.091"/>
	</g>
	<g id="XMLID_1604_">
		<path id="XMLID_1605_" style="fill:{star_color};" {star_stroke_attr} d="M186.146,193.071l19.726,48.111l51.852,3.894c6.081,0.457,8.551,8.056,3.899,12
			l-39.66,33.628l12.32,50.517c1.445,5.925-5.02,10.622-10.208,7.417l-44.237-27.328l-44.239,27.327
			c-5.188,3.205-11.653-1.492-10.208-7.417l12.32-50.517l-39.66-33.628c-4.651-3.944-2.182-11.544,3.899-12l51.852-3.894
			l19.726-48.111C175.841,187.428,183.832,187.428,186.146,193.071z"/>
		<path id="XMLID_1606_" style="fill:{frame_color};" d="M227.65,359.676c-3.097,0-6.15-0.875-8.832-2.531l-38.981-24.082l-38.981,24.082
			c-2.682,1.656-5.735,2.531-8.831,2.531c-5.121,0-10.083-2.425-13.272-6.485c-3.188-4.06-4.309-9.286-3.075-14.341l10.856-44.515
			l-34.949-29.633c-5.227-4.431-7.236-11.506-5.119-18.023s7.901-11.062,14.736-11.575l45.691-3.432l17.384-42.395
			c2.6-6.341,8.707-10.438,15.561-10.438s12.961,4.097,15.562,10.438l17.383,42.395l45.691,3.432
			c6.835,0.514,12.619,5.058,14.736,11.575s0.107,13.593-5.119,18.024l-34.949,29.632l10.856,44.516
			c1.233,5.054,0.112,10.28-3.075,14.339C237.732,357.251,232.77,359.676,227.65,359.676z M110.437,254.466l38.454,32.605
			l-11.945,48.979l42.892-26.496l42.892,26.496l-11.945-48.979l38.454-32.605l-50.274-3.774l-19.126-46.646l-19.126,46.646
			L110.437,254.466z"/>
	</g>
</g>
</svg>'''

    return svg_template

# --- Contract Functions ---

def check_if_has_badge(recipient_address: str) -> bool:
    """Checks if the recipient already has a badge."""
    logger.info(f"Attempting contract call: hasBadge({recipient_address})") # Log the attempt
    try:
        checksum_recipient = Web3.to_checksum_address(recipient_address)
        # --- Log before the call ---
        logger.debug(f"Calling contract.functions.hasBadge for {checksum_recipient}")
        has_badge = contract.functions.hasBadge(checksum_recipient).call()
        # --- Log after successful call ---
        logger.debug(f"contract.functions.hasBadge returned: {has_badge}")
        logger.info(f"Address {recipient_address} has badge: {has_badge}")
        return has_badge
    except Exception as e:
        # --- Log the specific error --- 
        logger.error(f"Error calling contract hasBadge for {recipient_address}: {e}", exc_info=True)
        # exc_info=True will log the full traceback
        # Default to assuming they might have one to prevent accidental mints on error
        return True

def generate_token_uri(recipient_address: str, reputation_data: dict) -> str:
    """
    Generates a token URI containing inline SVG metadata.
    """
    category = reputation_data.get('category', 'Unknown')

    # 1. Generate the SVG image string
    svg_string = generate_badge_svg(category)

    # 2. Base64 encode the SVG string
    svg_base64 = base64.b64encode(svg_string.encode('utf-8')).decode('utf-8')

    # 3. Create the image data URI
    image_data_uri = f"data:image/svg+xml;base64,{svg_base64}"

    # 4. Define the rest of the metadata
    metadata = {
        "name": f"BNB Reputation Badge - {category}",
        "description": f"A soulbound reputation badge for {recipient_address} on BNB Chain, representing the {category} category.",
        "image": image_data_uri, # Use the generated SVG data URI
        "attributes": [
            {"trait_type": "Category", "value": category},
            {"trait_type": "Score", "value": reputation_data.get('score', 0)},
            {"trait_type": "Transactions", "value": reputation_data.get('details', {}).get('transaction_count', 0)}
            # Add more attributes as needed
        ]
    }

    # 5. Create the final Token URI (base64 encoded JSON metadata)
    metadata_json_string = json.dumps(metadata)
    metadata_base64 = base64.b64encode(metadata_json_string.encode('utf-8')).decode('utf-8')
    token_uri = f"data:application/json;base64,{metadata_base64}"
    logger.info(f"Generated Token URI for {recipient_address} (contains inline SVG)")
    return token_uri

def mint_reputation_badge(recipient_address: str, reputation_data: dict):
    """Mints a new reputation badge NFT to the recipient."""
    try:
        checksum_recipient = Web3.to_checksum_address(recipient_address)

        # 1. Check if recipient already has a badge
        if check_if_has_badge(checksum_recipient):
            logger.warning(f"Recipient {recipient_address} already has a badge. Minting aborted.")
            return {"success": False, "message": "Recipient already has a badge.", "tx_hash": None}

        # 2. Generate Token URI (Metadata)
        token_uri = generate_token_uri(checksum_recipient, reputation_data)

        # 3. Prepare the transaction
        logger.info(f"Preparing mint transaction for {recipient_address}...")
        nonce = w3.eth.get_transaction_count(minter_address)
        
        # --- Force a fixed high gas limit --- 
        # Bypass gas estimation as it seems problematic for certain URIs
        # Increase limit further due to "out of gas" error
        gas_limit = 15000000 
        logger.info(f"Using fixed gas limit: {gas_limit}")
        # --- End forcing gas limit ---
        

        # Build transaction - contract uses internal _nextTokenId
        txn = contract.functions.safeMint(checksum_recipient, token_uri).build_transaction({
            'chainId': w3.eth.chain_id,
            'gas': gas_limit, # Use fixed gas limit
            'gasPrice': w3.eth.gas_price, # Or set manually for networks like opBNB
            'nonce': nonce,
            'from': minter_address # Ensure this matches the sender
        })

        # 4. Sign the transaction
        signed_txn = minter_account.sign_transaction(txn)

        # 5. Send the transaction
        logger.info(f"Sending mint transaction for {recipient_address}...")
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        logger.info(f"Transaction sent with hash: {tx_hash.hex()}")

        # 6. Wait for transaction receipt (optional but recommended)
        logger.info("Waiting for transaction receipt...")
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        if tx_receipt.status == 1:
            logger.info(f"Mint transaction successful for {recipient_address}. Tx: {tx_hash.hex()}")
            # --- Try to extract tokenId from logs --- 
            mint_event_signature = w3.keccak(text="BadgeMinted(address,uint256,string)").hex()
            transfer_event_signature = w3.keccak(text="Transfer(address,address,uint256)").hex()
            minted_token_id = None
            for log in tx_receipt.logs:
                # Check for BadgeMinted event first (more specific)
                if log.topics[0].hex() == mint_event_signature and len(log.topics) == 3: # recipient, tokenId are indexed
                    # topics[0] = event signature
                    # topics[1] = recipient (indexed address)
                    # topics[2] = tokenId (indexed uint256)
                    minted_token_id = w3.to_int(hexstr=log.topics[2].hex()) 
                    break
                # Fallback to Transfer event if BadgeMinted not found or signature changed
                elif log.topics[0].hex() == transfer_event_signature and len(log.topics) == 4:
                    # topics[0] = event signature
                    # topics[1] = from (indexed address - should be 0x0 for mint)
                    # topics[2] = to (indexed address)
                    # topics[3] = tokenId (indexed uint256)
                    if log.topics[1].hex() == '0x0000000000000000000000000000000000000000000000000000000000000000': # Check it's a mint
                        minted_token_id = w3.to_int(hexstr=log.topics[3].hex()) 
                        break
            
            if minted_token_id is not None:
                 logger.info(f"Extracted minted tokenId: {minted_token_id}")
            else:
                 logger.warning("Could not extract tokenId from event logs.")

            return {
                "success": True, 
                "message": "Badge minted successfully!", 
                "tx_hash": tx_hash.hex(),
                "tokenId": minted_token_id # Include the extracted tokenId
            }
        else:
            logger.error(f"Failed to mint badge for {recipient_address}. Tx failed. Receipt status: {tx_receipt.get('status', 'N/A')}")
            return {"success": False, "message": "Transaction failed.", "tx_hash": tx_hash.hex()}

    except ValueError:
        logger.error(f"Invalid recipient address provided: {recipient_address}")
        return {"success": False, "message": "Invalid recipient address", "tx_hash": None}
    except Exception as e:
        logger.exception(f"Error minting badge for {recipient_address}: {e}") # Log full traceback
        return {"success": False, "message": f"An error occurred: {e}", "tx_hash": None}

if __name__ == '__main__':
    # --- Test SVG Generation ---
    print("\n--- Generating SVG Previews ---")
    categories_to_preview = ["Newcomer", "Explorer", "DeFi User", "Power User"]
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'svg_previews')
    os.makedirs(output_dir, exist_ok=True)

    for category in categories_to_preview:
        print(f"Generating preview for: {category}")
        try:
            svg_content = generate_badge_svg(category)
            filename = f"preview_{category.replace(' ', '_').lower()}.svg"
            filepath = os.path.join(output_dir, filename)
            with open(filepath, 'w') as f:
                f.write(svg_content)
            print(f"  Saved preview to: {filepath}")
        except Exception as e:
            print(f"  Error generating SVG for {category}: {e}")

    print("--- SVG Preview Generation Complete ---")

    # --- Original Example Usage (Commented out for SVG preview) ---
    # test_recipient = "0xRecipientAddressHere" # Replace with a valid testnet address *without* a badge
    # test_reputation = {
    #     'category': 'Explorer',
    #     'score': 40,
    #     'details': {'transaction_count': 10}
    # }
    # print(f"\nAttempting to mint badge for: {test_recipient}")
    # result = mint_reputation_badge(test_recipient, test_reputation)
    # print("\nMinting Result:")
    # import json
    # # Convert receipt bytes to hex for JSON serialization if needed
    # if result.get('receipt'):
    #   pass # Receipt object might not be directly serializable, handle as needed
    # print(json.dumps(result, indent=2, default=str))

    # # Check badge status after minting (or before)
    # # print(f"\nChecking if {test_recipient} has badge:")
    # # print(check_if_has_badge(test_recipient))
