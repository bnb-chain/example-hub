from pathlib import Path
import json
import time
from typing import Dict, List, Optional, Union
import hashlib

class NFTMetadataGenerator:
    def __init__(self, config: dict):
        """Initialize NFT metadata generator with configuration"""
        self.config = config
        self.collection_config = config['collection']
        
    def create_nft_metadata(
        self,
        name: str,
        image_uri: str,
        description: Optional[str] = None,
        attributes: Optional[List[Dict[str, str]]] = None,
        external_url: Optional[str] = None,
        animation_url: Optional[str] = None,
        background_color: Optional[str] = None,
        youtube_url: Optional[str] = None
    ) -> dict:
        """
        Create metadata for a single NFT following OpenSea and BNB Chain standards
        
        Args:
            name: Name of the NFT
            image_uri: URI to the image file (IPFS or HTTP)
            description: Description of the NFT
            attributes: List of trait dictionaries with trait_type and value
            external_url: External URL for the NFT
            animation_url: URL to any animation
            background_color: Background color in hex
            youtube_url: URL to a YouTube video
            
        Returns:
            dict: Complete NFT metadata dictionary
        """
        metadata = {
            "name": name,
            "image": image_uri,
            "description": description or self.collection_config['description'],
            "external_link": external_url or self.collection_config['external_url'],
            "seller_fee_basis_points": self.collection_config['seller_fee_basis_points'],
            "fee_recipient": self.collection_config['fee_recipient']
        }
        
        # Add optional fields if provided
        if attributes:
            metadata["attributes"] = attributes
        if animation_url:
            metadata["animation_url"] = animation_url
        if background_color:
            metadata["background_color"] = background_color.lstrip("#")
        if youtube_url:
            metadata["youtube_url"] = youtube_url
            
        # Add BNB Chain specific fields
        metadata["chain"] = "BNB"
        metadata["creator"] = self.collection_config.get('creator_address', '')
        
        return metadata
    
    def create_collection_metadata(
        self,
        total_supply: int,
        image_uri: str,
        banner_uri: Optional[str] = None
    ) -> dict:
        """
        Create metadata for the entire NFT collection
        
        Args:
            total_supply: Total number of NFTs in collection
            image_uri: URI to collection logo/image
            banner_uri: URI to collection banner image
            
        Returns:
            dict: Collection metadata dictionary
        """
        metadata = {
            "name": self.collection_config['name'],
            "description": self.collection_config['description'],
            "image": image_uri,
            "external_link": self.collection_config['external_url'],
            "seller_fee_basis_points": self.collection_config['seller_fee_basis_points'],
            "fee_recipient": self.collection_config['fee_recipient'],
            "chain": "BNB",
            "creator": self.collection_config.get('creator_address', ''),
            "total_supply": total_supply,
            "created_at": int(time.time())
        }
        
        if banner_uri:
            metadata["banner_image"] = banner_uri
            
        return metadata
    
    def generate_token_id(self, image_data: bytes, salt: Optional[str] = None) -> int:
        """
        Generate a deterministic token ID based on image content
        
        Args:
            image_data: Raw image bytes
            salt: Optional salt to add to hash
            
        Returns:
            int: Token ID derived from image hash
        """
        # Create hash of image data
        hasher = hashlib.sha256()
        hasher.update(image_data)
        
        # Add salt if provided
        if salt:
            hasher.update(salt.encode())
            
        # Use first 8 bytes of hash as token ID
        token_id_bytes = hasher.digest()[:8]
        return int.from_bytes(token_id_bytes, byteorder='big')
    
    def save_metadata(self, metadata: dict, output_path: Union[str, Path]) -> None:
        """
        Save metadata to JSON file
        
        Args:
            metadata: Metadata dictionary to save
            output_path: Path to save the JSON file
        """
        output_path = Path(output_path)
        with open(output_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
    def validate_metadata(self, metadata: dict) -> bool:
        """
        Validate metadata structure and required fields
        
        Args:
            metadata: Metadata dictionary to validate
            
        Returns:
            bool: True if valid, raises ValueError if invalid
        """
        required_fields = ['name', 'image', 'description']
        
        # Check required fields
        for field in required_fields:
            if field not in metadata:
                raise ValueError(f"Missing required field: {field}")
                
        # Validate attributes format if present
        if 'attributes' in metadata:
            for attr in metadata['attributes']:
                if not isinstance(attr, dict):
                    raise ValueError("Attributes must be dictionaries")
                if 'trait_type' not in attr or 'value' not in attr:
                    raise ValueError("Attributes must have trait_type and value")
                    
        # Validate fee basis points
        fee_points = metadata.get('seller_fee_basis_points', 0)
        if not isinstance(fee_points, int) or fee_points < 0 or fee_points > 10000:
            raise ValueError("seller_fee_basis_points must be integer between 0 and 10000")
            
        return True