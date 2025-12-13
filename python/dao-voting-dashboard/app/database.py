"""Database operations for DAO voting dashboard."""

import sqlite3
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from app.config import config


class Database:
    """SQLite database manager for proposals and votes."""
    
    def __init__(self, db_path: Optional[Path] = None):
        """Initialize database connection."""
        self.db_path = db_path or config.get_database_path()
        self._init_db()
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        """Initialize database schema."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Proposals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS proposals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                creator TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP NOT NULL,
                status TEXT DEFAULT 'active',
                on_chain_id INTEGER DEFAULT NULL,
                on_chain_synced BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Votes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proposal_id INTEGER NOT NULL,
                voter_address TEXT NOT NULL,
                vote_choice TEXT NOT NULL,
                signature TEXT NOT NULL,
                message TEXT NOT NULL,
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                on_chain_synced BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (proposal_id) REFERENCES proposals (id),
                UNIQUE(proposal_id, voter_address)
            )
        """)
        
        conn.commit()
        conn.close()
    
    # Proposal operations
    
    def create_proposal(
        self,
        title: str,
        description: str,
        creator: str,
        end_time: datetime
    ) -> int:
        """Create a new proposal."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO proposals (title, description, creator, end_time)
            VALUES (?, ?, ?, ?)
        """, (title, description, creator, end_time))
        
        proposal_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return proposal_id
    
    def get_proposal(self, proposal_id: int) -> Optional[Dict[str, Any]]:
        """Get proposal by ID."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM proposals WHERE id = ?", (proposal_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def list_proposals(
        self,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List proposals with optional status filter."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        if status:
            cursor.execute(
                "SELECT * FROM proposals WHERE status = ? ORDER BY created_at DESC LIMIT ?",
                (status, limit)
            )
        else:
            cursor.execute(
                "SELECT * FROM proposals ORDER BY created_at DESC LIMIT ?",
                (limit,)
            )
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def update_proposal_status(self, proposal_id: int, status: str) -> bool:
        """Update proposal status."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE proposals SET status = ? WHERE id = ?",
            (status, proposal_id)
        )
        
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return updated
    
    def sync_proposal_to_chain(self, proposal_id: int, on_chain_id: int) -> bool:
        """Mark proposal as synced to chain."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE proposals 
            SET on_chain_id = ?, on_chain_synced = TRUE 
            WHERE id = ?
        """, (on_chain_id, proposal_id))
        
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return updated
    
    # Vote operations
    
    def cast_vote(
        self,
        proposal_id: int,
        voter_address: str,
        vote_choice: str,
        signature: str,
        message: str
    ) -> int:
        """Cast a vote on a proposal."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO votes (proposal_id, voter_address, vote_choice, signature, message)
            VALUES (?, ?, ?, ?, ?)
        """, (proposal_id, voter_address, vote_choice, signature, message))
        
        vote_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return vote_id
    
    def get_votes(self, proposal_id: int) -> List[Dict[str, Any]]:
        """Get all votes for a proposal."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM votes WHERE proposal_id = ? ORDER BY voted_at DESC",
            (proposal_id,)
        )
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_vote_counts(self, proposal_id: int) -> Dict[str, int]:
        """Get vote counts for a proposal."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT vote_choice, COUNT(*) as count
            FROM votes
            WHERE proposal_id = ?
            GROUP BY vote_choice
        """, (proposal_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        counts = {"for": 0, "against": 0, "abstain": 0}
        for row in rows:
            counts[row["vote_choice"]] = row["count"]
        
        return counts
    
    def has_voted(self, proposal_id: int, voter_address: str) -> bool:
        """Check if address has already voted."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM votes
            WHERE proposal_id = ? AND voter_address = ?
        """, (proposal_id, voter_address.lower()))
        
        result = cursor.fetchone()
        conn.close()
        
        return result["count"] > 0


# Global database instance
db = Database()
