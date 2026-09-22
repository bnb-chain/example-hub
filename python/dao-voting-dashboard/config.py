"""
Configuration management for DAO Voting Dashboard.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration."""
    
    # BNB Chain
    RPC_URL: str = os.getenv("RPC_URL", "https://data-seed-prebsc-1-s1.bnbchain.org:8545")
    GOVERNANCE_CONTRACT_ADDRESS: str = os.getenv(
        "GOVERNANCE_CONTRACT_ADDRESS",
        "0x1234567890123456789012345678901234567890"
    )
    
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "./data/dao_votes.db")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Governance Rules
    QUORUM_PERCENTAGE: int = int(os.getenv("QUORUM_PERCENTAGE", "20"))
    APPROVAL_THRESHOLD_PERCENTAGE: int = int(os.getenv("APPROVAL_THRESHOLD_PERCENTAGE", "50"))
    
    # Demo Key (for testing only)
    DEMO_PRIVATE_KEY: str = os.getenv(
        "DEMO_PRIVATE_KEY",
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    )
    
    @classmethod
    def ensure_data_dir(cls):
        """Ensure data directory exists."""
        Path(cls.DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)


config = Config()
