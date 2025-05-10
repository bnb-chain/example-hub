import os
import logging
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

from .analyzer import analyze_address_reputation
from .contract_interaction import mint_reputation_badge, check_if_has_badge, CONTRACT_ADDRESS, generate_badge_svg

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
CONTRACT_ADDR = CONTRACT_ADDRESS
TESTNET_SCAN_URL = os.getenv("TESTNET_SCAN_URL", "https://testnet.bscscan.com")

# --- Routes ---

@app.route('/')
def index():
    """Serves the main HTML page using a template."""
    # Pass necessary constants to the frontend template
    return render_template(
        "index.html", 
        contract_address=CONTRACT_ADDR, 
        bsc_scan_url=TESTNET_SCAN_URL
    )

@app.route('/analyze', methods=['POST'])
def handle_analyze():
    """Handles the address analysis request from the frontend."""
    data = request.get_json()
    if not data or 'address' not in data:
        logging.warning("Analysis request received without address.")
        return jsonify({"success": False, "error": "Address is required"}), 400
    
    address = data['address']
    logging.info(f"Received analysis request for address: {address}")

    try:
        # Perform the reputation analysis (now includes rationale)
        reputation_data = analyze_address_reputation(address)
        # The rationale is already included within reputation_data if successful
        logging.info(f"Analysis result for {address}: {reputation_data}")

        # Check if analysis itself resulted in an error category
        is_analysis_error = reputation_data.get("category") == "Error"

        # Generate SVG preview for the badge based on the category
        badge_svg_preview = None
        category = reputation_data.get("category")
        if category and not is_analysis_error: # Avoid generating for error cases
            try:
                badge_svg_preview = generate_badge_svg(category)
                logging.info(f"Generated SVG preview for category: {category}")
            except Exception as svg_err:
                # Log SVG generation error but don't fail the whole analysis
                logging.error(f"Error generating SVG preview for {address}, category {category}: {svg_err}", exc_info=True)
        
        # Add the SVG preview (or None if failed) to the response
        reputation_data['badge_svg_preview'] = badge_svg_preview

        # Return success: False if analysis function indicated an error
        # The reputation_data dictionary now naturally contains the 'rationale' key from analyzer.py
        return jsonify({"success": not is_analysis_error, "data": reputation_data}), 200

    except Exception as e:
        logging.error(f"Error analyzing address {address}: {e}", exc_info=True)
        # Return a generic error to the frontend
        # Ensure error response structure is consistent (add empty rationale)
        return jsonify({"success": False, "error": f"Analysis failed due to an internal error.", "data": {"rationale": ""}}), 500

@app.route('/check_badge', methods=['POST'])
def handle_check_badge():
    """Checks if a given address already holds a reputation badge."""
    data = request.get_json()
    if not data or 'address' not in data:
        logging.warning("Check badge request received without address.")
        return jsonify({"success": False, "error": "Address is required"}), 400

    address = data['address']
    logging.info(f"Received check badge request for address: {address}")

    try:
        # Call the contract interaction function
        has_badge = check_if_has_badge(address)
        logging.info(f"Badge check for {address}: {'Found' if has_badge else 'Not found'}")
        return jsonify({"success": True, "has_badge": has_badge}), 200
        
    except Exception as e:
        logging.error(f"Error checking badge for {address}: {e}", exc_info=True)
        # Return a generic error to the frontend
        return jsonify({"success": False, "error": f"Failed to check badge status due to an internal error."}), 500

@app.route('/mint', methods=['POST'])
def handle_mint():
    """Handles the badge minting request from the frontend."""
    data = request.get_json()
    # Validate required data presence
    address = data.get('address')
    reputation_data = data.get('reputation_data')

    if not address or not reputation_data:
        logging.warning("Mint request received with missing address or reputation data.")
        return jsonify({"success": False, "error": "Address and reputation data are required"}), 400

    logging.info(f"Received mint request for address: {address}")

    try:
        # Call the contract interaction function to mint the badge
        # This function handles the transaction building, signing, and sending.
        # It waits for the transaction receipt.
        result = mint_reputation_badge(address, reputation_data)
        
        # The result dictionary contains keys: "success", "message", "tx_hash", "tokenId"
        if result["success"]:
            logging.info(f"Successfully minted badge for {address}. Tx: {result.get('tx_hash')}, TokenID: {result.get('tokenId')}")
            return jsonify(result), 200 # OK
        else:
            # Include tx_hash in failure response if available (helps debugging)
            logging.error(f"Minting failed for {address}. Reason: {result.get('message')}, Tx Hash (attempted): {result.get('tx_hash')}")
            # Don't expose detailed internal errors, use the message from contract_interaction
            error_payload = {
                "success": False, 
                "message": result.get("message", "Minting failed due to an unexpected error."), 
                "tx_hash": result.get("tx_hash") # Include hash even on failure
            }
            # Use 500 for server-side/contract errors, 400/403 might be applicable depending on message
            status_code = 500 if "error" in result.get("message", "").lower() else 400 
            return jsonify(error_payload), status_code
            
    except Exception as e:
        # Catch any unexpected exceptions during the mint process
        logging.error(f"Unexpected error processing mint request for {address}: {e}", exc_info=True)
        # Return a generic server error message
        return jsonify({"success": False, "message": f"Minting process failed due to an internal server error."}), 500

# Note: Running with 'flask run' (as recommended in README) handles app execution.
# The following block is only needed if running the script directly via 'python src/app.py'.
# if __name__ == '__main__':
#     # Set debug=False for production environments
#     # Use environment variable for port if needed, default to 5001
#     port = int(os.environ.get('PORT', 5001)) 
#     app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', host='0.0.0.0', port=port)
