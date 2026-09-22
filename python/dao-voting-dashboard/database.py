"""
Database models and storage for DAO proposals and votes.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict
from pathlib import Path
from config import config


class Database:
    """SQLite database manager for DAO voting."""
    
    def __init__(self, db_path: str = None):
        """Initialize database connection."""
        self.db_path = db_path or config.DATABASE_PATH
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
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
                UNIQUE(title)
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
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                synced_to_chain BOOLEAN DEFAULT 0,
                FOREIGN KEY (proposal_id) REFERENCES proposals(id),
                UNIQUE(proposal_id, voter_address)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def create_proposal(
        self,
        title: str,
        description: str,
        creator: str,
        end_time: str
    ) -> Optional[int]:
        """Create a new proposal."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO proposals (title, description, creator, end_time)
                VALUES (?, ?, ?, ?)
            """, (title, description, creator, end_time))
            
            proposal_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return proposal_id
        except sqlite3.IntegrityError:
            return None
    
    def get_proposal(self, proposal_id: int) -> Optional[Dict]:
        """Get a proposal by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM proposals WHERE id = ?
        """, (proposal_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def list_proposals(self, status: str = None) -> List[Dict]:
        """List all proposals, optionally filtered by status."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if status:
            cursor.execute("""
                SELECT * FROM proposals WHERE status = ? ORDER BY created_at DESC
            """, (status,))
        else:
            cursor.execute("""
                SELECT * FROM proposals ORDER BY created_at DESC
            """)
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def close_proposal(self, proposal_id: int) -> bool:
        """Close a proposal."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE proposals SET status = 'closed' WHERE id = ?
        """, (proposal_id,))
        
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        
        return success
    
    def create_vote(
        self,
        proposal_id: int,
        voter_address: str,
        vote_choice: str,
        signature: str
    ) -> Optional[int]:
        """Record a vote."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO votes (proposal_id, voter_address, vote_choice, signature)
                VALUES (?, ?, ?, ?)
            """, (proposal_id, voter_address, vote_choice, signature))
            
            vote_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return vote_id
        except sqlite3.IntegrityError:
            return None
    
    def get_votes(self, proposal_id: int) -> List[Dict]:
        """Get all votes for a proposal."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM votes WHERE proposal_id = ? ORDER BY timestamp DESC
        """, (proposal_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_vote_counts(self, proposal_id: int) -> Dict[str, int]:
        """Get vote counts for a proposal."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT vote_choice, COUNT(*) as count
            FROM votes
            WHERE proposal_id = ?
            GROUP BY vote_choice
        """, (proposal_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        counts = {"for": 0, "against": 0, "abstain": 0}
        for choice, count in results:
            counts[choice] = count
        
        return counts
    
    def mark_votes_synced(self, proposal_id: int):
        """Mark all votes for a proposal as synced to chain."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE votes SET synced_to_chain = 1 WHERE proposal_id = ?
        """, (proposal_id,))
        
        conn.commit()
        conn.close()


# Global database instance
db = Database()
