"""Configuration management."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""
    
    # BNB Chain
    RPC_URL = os.getenv("RPC_URL", "https://data-seed-prebsc-1-s1.bnbchain.org:8545")
    CHAIN_ID = int(os.getenv("CHAIN_ID", "97"))
    TICKET_CONTRACT_ADDRESS = os.getenv(
        "TICKET_CONTRACT_ADDRESS",
        "0x1234567890123456789012345678901234567890"
    )
    
    # Server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/tickets.db")
    
    @staticmethod
    def get_database_path() -> Path:
        """Get database path and ensure directory exists."""
        db_path = Path(Config.DATABASE_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return db_path
    
    @staticmethod
    def get_qr_directory() -> Path:
        """Get QR code directory and ensure it exists."""
        qr_dir = Path("static/qr_codes")
        qr_dir.mkdir(parents=True, exist_ok=True)
        return qr_dir


config = Config()
