"""Database operations for NFT ticketing system."""

import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict
from pathlib import Path
from config import config


class Database:
    """SQLite database manager for events and tickets."""
    
    def __init__(self, db_path: str = None):
        """Initialize database connection."""
        self.db_path = db_path or config.get_database_path()
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                location TEXT,
                capacity INTEGER NOT NULL,
                tickets_sold INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tickets table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_id INTEGER UNIQUE NOT NULL,
                event_id INTEGER NOT NULL,
                owner_address TEXT NOT NULL,
                qr_code_path TEXT,
                checked_in BOOLEAN DEFAULT 0,
                checked_in_at TIMESTAMP,
                minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def create_event(
        self,
        name: str,
        date: str,
        location: str,
        capacity: int
    ) -> int:
        """Create a new event."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO events (name, date, location, capacity)
            VALUES (?, ?, ?, ?)
        """, (name, date, location, capacity))
        
        event_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return event_id
    
    def get_event(self, event_id: int) -> Optional[Dict]:
        """Get an event by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def list_events(self) -> List[Dict]:
        """List all events."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM events ORDER BY date DESC")
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def mint_ticket(
        self,
        token_id: int,
        event_id: int,
        owner_address: str,
        qr_code_path: str = None
    ) -> int:
        """Mint a new ticket."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Insert ticket
        cursor.execute("""
            INSERT INTO tickets (token_id, event_id, owner_address, qr_code_path)
            VALUES (?, ?, ?, ?)
        """, (token_id, event_id, owner_address, qr_code_path))
        
        ticket_id = cursor.lastrowid
        
        # Update event tickets_sold
        cursor.execute("""
            UPDATE events
            SET tickets_sold = tickets_sold + 1
            WHERE id = ?
        """, (event_id,))
        
        conn.commit()
        conn.close()
        
        return ticket_id
    
    def get_ticket(self, token_id: int) -> Optional[Dict]:
        """Get a ticket by token ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM tickets WHERE token_id = ?", (token_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def get_tickets_by_event(self, event_id: int) -> List[Dict]:
        """Get all tickets for an event."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM tickets WHERE event_id = ?", (event_id,))
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def check_in_ticket(self, token_id: int) -> bool:
        """Mark a ticket as checked in."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE tickets
            SET checked_in = 1, checked_in_at = ?
            WHERE token_id = ? AND checked_in = 0
        """, (datetime.now().isoformat(), token_id))
        
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return rows_affected > 0
    
    def get_next_token_id(self) -> int:
        """Get the next available token ID."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT MAX(token_id) FROM tickets")
        result = cursor.fetchone()[0]
        conn.close()
        
        return (result or 0) + 1
