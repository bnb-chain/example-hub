"""QR code generation for tickets."""

import qrcode
from pathlib import Path
from config import config


def generate_ticket_qr(token_id: int, event_id: int) -> str:
    """
    Generate QR code for a ticket.
    
    Args:
        token_id: Token ID
        event_id: Event ID
        
    Returns:
        Path to generated QR code image
    """
    # QR code data: simple token ID for verification
    qr_data = f"TICKET:{token_id}:EVENT:{event_id}"
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Generate image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to file
    qr_dir = config.get_qr_directory()
    filename = f"ticket_{token_id}.png"
    filepath = qr_dir / filename
    
    img.save(str(filepath))
    
    return f"static/qr_codes/{filename}"


def parse_qr_data(qr_data: str) -> dict:
    """
    Parse QR code data.
    
    Args:
        qr_data: QR code string data
        
    Returns:
        Dict with token_id and event_id
    """
    try:
        # Expected format: "TICKET:123:EVENT:456"
        parts = qr_data.split(":")
        
        if len(parts) != 4 or parts[0] != "TICKET" or parts[2] != "EVENT":
            return None
        
        return {
            "token_id": int(parts[1]),
            "event_id": int(parts[3])
        }
    except (ValueError, IndexError):
        return None
