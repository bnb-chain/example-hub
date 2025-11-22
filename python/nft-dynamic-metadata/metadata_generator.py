"""
Metadata Generator

Generates dynamic ERC-721 compatible JSON metadata based on token state.
"""

from typing import Dict


class MetadataGenerator:
    """Generates dynamic NFT metadata."""
    
    # Image URLs for different states
    IMAGE_URLS = {
        # Weather states
        "sunny": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-sunny.png",
        "rainy": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-rainy.png",
        "cloudy": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-cloudy.png",
        "stormy": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-stormy.png",
        "snowy": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-snowy.png",
        
        # Price states
        "bullish": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-bull.png",
        "bearish": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-bear.png",
        "neutral": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-neutral.png",
        
        # Sports states
        "win": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-win.png",
        "loss": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-loss.png",
        "draw": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-draw.png",
        
        # Default
        "unknown": "https://raw.githubusercontent.com/bnb-chain/example-hub/main/assets/nft-default.png"
    }
    
    # State descriptions
    STATE_DESCRIPTIONS = {
        # Weather
        "sunny": "A bright and cheerful day!",
        "rainy": "Raindrops falling gently.",
        "cloudy": "Overcast skies ahead.",
        "stormy": "Thunder and lightning!",
        "snowy": "A winter wonderland.",
        
        # Price
        "bullish": "Markets are soaring! 📈",
        "bearish": "Markets are declining. 📉",
        "neutral": "Markets are stable.",
        
        # Sports
        "win": "Victory! 🏆",
        "loss": "Better luck next time.",
        "draw": "An even match.",
        
        # Default
        "unknown": "State unknown"
    }
    
    def generate_metadata(self, token_id: int, state: str, owner: str = None) -> Dict:
        """
        Generate ERC-721 compatible metadata for a token.
        
        Args:
            token_id: The token ID
            state: Current dynamic state
            owner: Token owner address (optional)
            
        Returns:
            Metadata dict following ERC-721 standard
        """
        image_url = self.IMAGE_URLS.get(state, self.IMAGE_URLS["unknown"])
        description = self.STATE_DESCRIPTIONS.get(state, self.STATE_DESCRIPTIONS["unknown"])
        
        metadata = {
            "name": f"Dynamic NFT #{token_id}",
            "description": f"NFT with dynamic metadata that updates based on oracle data. Current state: {description}",
            "image": image_url,
            "attributes": [
                {
                    "trait_type": "Token ID",
                    "value": token_id
                },
                {
                    "trait_type": "Current State",
                    "value": state.capitalize()
                }
            ]
        }
        
        if owner:
            metadata["attributes"].append({
                "trait_type": "Owner",
                "value": owner
            })
        
        return metadata
    
    def get_image_url(self, state: str) -> str:
        """
        Get the image URL for a given state.
        
        Args:
            state: The state string
            
        Returns:
            Image URL string
        """
        return self.IMAGE_URLS.get(state, self.IMAGE_URLS["unknown"])
    
    def get_state_description(self, state: str) -> str:
        """
        Get the description for a given state.
        
        Args:
            state: The state string
            
        Returns:
            Description string
        """
        return self.STATE_DESCRIPTIONS.get(state, self.STATE_DESCRIPTIONS["unknown"])
