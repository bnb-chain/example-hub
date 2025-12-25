import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

DEFAULT_CONFIG = {
    'stable_diffusion': {
        'model_id': 'runwayml/stable-diffusion-v1-5',
        'prompt_prefix': 'high quality, detailed, digital art',
        'negative_prompt': 'blurry, low quality, distorted',
        'num_inference_steps': 50,
        'guidance_scale': 7.5,
        'image_size': 512
    },
    'collection': {
        'name': 'AI Generated Art Collection',
        'symbol': 'AIGEN',
        'description': 'Unique AI-generated artwork collection',
        'external_url': '',
        'seller_fee_basis_points': 500,
        'fee_recipient': ''
    },
    'blockchain': {
        'network': 'testnet',
        'testnet': {
            'rpc_url': 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
            'chain_id': 97
        },
        'mainnet': {
            'rpc_url': 'https://bsc-dataseed.bnbchain.org',
            'chain_id': 56
        },
        'gas_price_multiplier': 1.1,
        'ipfs': {
            'gateway': 'https://ipfs.io/ipfs/',
            'api_url': 'http://localhost:5001'
        },
        'confirmation_blocks': 2
    },
    'output': {
        'image_format': 'png',
        'metadata_format': 'json',
        'base_path': './output'
    }
}

def load_config() -> Dict[str, Any]:
    """
    Load and validate configuration from config.yml file and environment variables
    
    Returns:
        dict: Merged and validated configuration
    """
    # Load environment variables
    load_dotenv()
    
    # Load config file
    config_path = Path(__file__).parent.parent.parent / 'config' / 'config.yml'
    
    if not config_path.exists():
        logger.warning(f"Configuration file not found at {config_path}. Using default configuration.")
        config = DEFAULT_CONFIG
    else:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
    
    # Merge with default config
    merged_config = merge_configs(DEFAULT_CONFIG, config)
    
    # Override with environment variables if present
    merged_config = override_from_env(merged_config)
    
    # Validate configuration
    validate_config(merged_config)
    
    return merged_config

def merge_configs(default: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively merge user config with default config
    
    Args:
        default: Default configuration dictionary
        user: User configuration dictionary
        
    Returns:
        dict: Merged configuration
    """
    result = default.copy()
    
    for key, value in user.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_configs(result[key], value)
        else:
            result[key] = value
            
    return result

def override_from_env(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Override configuration values from environment variables
    
    Args:
        config: Configuration dictionary
        
    Returns:
        dict: Configuration with environment variable overrides
    """
    env_mappings = {
        'STABLE_DIFFUSION_MODEL': ('stable_diffusion', 'model_id'),
        'COLLECTION_NAME': ('collection', 'name'),
        'COLLECTION_SYMBOL': ('collection', 'symbol'),
        'BLOCKCHAIN_NETWORK': ('blockchain', 'network'),
        'RPC_URL': ('blockchain', 'rpc_url'),
        'FEE_RECIPIENT': ('collection', 'fee_recipient')
    }
    
    for env_var, config_path in env_mappings.items():
        value = os.getenv(env_var)
        if value:
            current = config
            for key in config_path[:-1]:
                current = current.setdefault(key, {})
            current[config_path[-1]] = value
            
    return config

def validate_config(config: Dict[str, Any]) -> None:
    """
    Validate configuration values
    
    Args:
        config: Configuration dictionary to validate
        
    Raises:
        ValueError: If configuration is invalid
    """
    # Validate Stable Diffusion settings
    sd_config = config.get('stable_diffusion', {})
    if not sd_config.get('model_id'):
        raise ValueError("Stable Diffusion model_id is required")
    
    # Validate collection settings
    collection = config.get('collection', {})
    if not collection.get('name'):
        raise ValueError("Collection name is required")
    if not collection.get('symbol'):
        raise ValueError("Collection symbol is required")
    
    fee_points = collection.get('seller_fee_basis_points', 0)
    if not isinstance(fee_points, int) or fee_points < 0 or fee_points > 10000:
        raise ValueError("seller_fee_basis_points must be between 0 and 10000")
    
    # Validate blockchain settings
    blockchain = config.get('blockchain', {})
    network = blockchain.get('network')
    if network not in ['testnet', 'mainnet']:
        raise ValueError("blockchain.network must be 'testnet' or 'mainnet'")

def ensure_output_dir(base_path: str, collection_name: Optional[str] = None) -> Path:
    """
    Ensure output directory exists and return its path
    
    Args:
        base_path: Base output directory path
        collection_name: Optional collection subdirectory name
        
    Returns:
        Path: Created directory path
    """
    output_path = Path(base_path)
    if collection_name:
        output_path = output_path / collection_name
    
    output_path.mkdir(parents=True, exist_ok=True)
    return output_path

def get_metadata_template(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get the base metadata template for NFTs
    
    Args:
        config: Configuration dictionary
        
    Returns:
        dict: Metadata template
    """
    collection_config = config['collection']
    return {
        'name': '',  # Will be set per NFT
        'description': collection_config['description'],
        'external_url': collection_config['external_url'],
        'image': '',  # Will be set per NFT
        'attributes': [],  # Will be set per NFT
        'seller_fee_basis_points': collection_config['seller_fee_basis_points'],
        'fee_recipient': collection_config['fee_recipient']
    }

def get_network_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get network-specific configuration
    
    Args:
        config: Configuration dictionary
        
    Returns:
        dict: Network configuration for current network
    """
    network = config['blockchain']['network']
    return config['blockchain'][network]