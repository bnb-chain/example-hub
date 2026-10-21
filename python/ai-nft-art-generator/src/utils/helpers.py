import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Union, Dict, Any, List
import requests
from PIL import Image
import io

logger = logging.getLogger(__name__)

def hash_file(file_path: Union[str, Path], algorithm: str = 'sha256') -> str:
    """
    Calculate hash of a file
    
    Args:
        file_path: Path to the file
        algorithm: Hash algorithm to use (default: sha256)
        
    Returns:
        str: Hexadecimal hash string
    """
    hasher = hashlib.new(algorithm)
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hasher.update(chunk)
    return hasher.hexdigest()

def save_json(data: Dict[str, Any], file_path: Union[str, Path], pretty: bool = True) -> None:
    """
    Save data as JSON file
    
    Args:
        data: Data to save
        file_path: Path to save the JSON file
        pretty: Whether to format JSON with indentation (default: True)
    """
    with open(file_path, 'w') as f:
        if pretty:
            json.dump(data, f, indent=2)
        else:
            json.dump(data, f)

def load_json(file_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Load data from JSON file
    
    Args:
        file_path: Path to the JSON file
        
    Returns:
        dict: Loaded JSON data
    """
    with open(file_path, 'r') as f:
        return json.load(f)

def optimize_image(
    image: Image.Image,
    max_size: int = 1024,
    quality: int = 90,
    format: str = 'PNG'
) -> Image.Image:
    """
    Optimize image for NFT storage
    
    Args:
        image: PIL Image object
        max_size: Maximum dimension size
        quality: JPEG quality (if applicable)
        format: Output format ('PNG' or 'JPEG')
        
    Returns:
        Image: Optimized image
    """
    # Resize if needed
    if max(image.size) > max_size:
        ratio = max_size / max(image.size)
        new_size = tuple(int(dim * ratio) for dim in image.size)
        image = image.resize(new_size, Image.LANCZOS)
    
    # Convert to RGB if needed
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    # Save to buffer
    buffer = io.BytesIO()
    if format.upper() == 'PNG':
        image.save(buffer, format='PNG', optimize=True)
    else:
        image.save(buffer, format='JPEG', quality=quality, optimize=True)
    
    # Return new image
    buffer.seek(0)
    return Image.open(buffer)

def validate_wallet_address(address: str) -> bool:
    """
    Validate BNB Chain wallet address format
    
    Args:
        address: Wallet address to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not address:
        return False
    
    # Check length
    if len(address) != 42:
        return False
    
    # Check prefix
    if not address.startswith('0x'):
        return False
    
    # Check hex characters
    try:
        int(address[2:], 16)
        return True
    except ValueError:
        return False

def estimate_gas_cost(
    gas_limit: int,
    gas_price: int,
    token_price: float = None
) -> Dict[str, float]:
    """
    Estimate transaction gas cost in BNB and USD
    
    Args:
        gas_limit: Gas limit for the transaction
        gas_price: Gas price in Wei
        token_price: Optional BNB price in USD
        
    Returns:
        dict: Estimated costs in BNB and USD (if price provided)
    """
    gas_cost_wei = gas_limit * gas_price
    gas_cost_bnb = gas_cost_wei / 1e18
    
    result = {'bnb': gas_cost_bnb}
    
    if token_price:
        result['usd'] = gas_cost_bnb * token_price
        
    return result

def retry_with_backoff(func: callable, max_retries: int = 3, initial_delay: float = 1.0):
    """
    Decorator for retrying functions with exponential backoff
    
    Args:
        func: Function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
    """
    from functools import wraps
    import time
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        delay = initial_delay
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt == max_retries - 1:
                    raise
                    
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                time.sleep(delay)
                delay *= 2
                
        raise last_exception
        
    return wrapper

def get_file_mime_type(file_path: Union[str, Path]) -> str:
    """
    Get MIME type of a file
    
    Args:
        file_path: Path to the file
        
    Returns:
        str: MIME type string
    """
    import mimetypes
    mime_type, _ = mimetypes.guess_type(str(file_path))
    return mime_type or 'application/octet-stream'

def chunks(lst: List[Any], n: int) -> List[List[Any]]:
    """
    Split list into n-sized chunks
    
    Args:
        lst: List to split
        n: Chunk size
        
    Returns:
        list: List of chunks
    """
    return [lst[i:i + n] for i in range(0, len(lst), n)]

@retry_with_backoff
def fetch_token_price(symbol: str = 'BNB') -> float:
    """
    Fetch current token price from CoinGecko
    
    Args:
        symbol: Token symbol (default: BNB)
        
    Returns:
        float: Current token price in USD
    """
    url = f"https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()['binancecoin']['usd']