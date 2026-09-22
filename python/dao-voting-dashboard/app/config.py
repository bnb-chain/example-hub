"""Configuration management for DAO voting dashboard."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration."""
    
    # BNB Chain
    RPC_URL: str = os.getenv("RPC_URL", "https://data-seed-prebsc-1-s1.bnbchain.org:8545")
    CHAIN_ID: int = int(os.getenv("CHAIN_ID", "97"))
    GOVERNANCE_CONTRACT_ADDRESS: str = os.getenv(
        "GOVERNANCE_CONTRACT_ADDRESS",
        "0x0000000000000000000000000000000000000000"
    )
    
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "./data/dao.db")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Voting Rules
    QUORUM_PERCENTAGE: int = int(os.getenv("QUORUM_PERCENTAGE", "20"))
    PASS_THRESHOLD_PERCENTAGE: int = int(os.getenv("PASS_THRESHOLD_PERCENTAGE", "50"))
    VOTING_PERIOD_SECONDS: int = int(os.getenv("VOTING_PERIOD_SECONDS", "604800"))
    
    @classmethod
    def get_database_path(cls) -> Path:
        """Get database path and ensure directory exists."""
        db_path = Path(cls.DATABASE_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return db_path


config = Config()
