import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any

# Database file path
DB_PATH = "diagrams.db"

def init_db():
    """Initialize the database if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create diagrams table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS diagrams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tags TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

def save_diagram(title: str, content: str, tags: Optional[str] = None) -> int:
    """
    Save a diagram to the database.
    
    Args:
        title: The title of the diagram
        content: The Mermaid diagram content
        tags: Optional comma-separated tags
        
    Returns:
        The ID of the saved diagram
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    cursor.execute(
        "INSERT INTO diagrams (title, content, created_at, updated_at, tags) VALUES (?, ?, ?, ?, ?)",
        (title, content, now, now, tags)
    )
    
    diagram_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return diagram_id

def update_diagram(diagram_id: int, title: str, content: str, tags: Optional[str] = None) -> bool:
    """
    Update an existing diagram.
    
    Args:
        diagram_id: The ID of the diagram to update
        title: The new title
        content: The new content
        tags: Optional comma-separated tags
        
    Returns:
        True if the update was successful, False otherwise
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    cursor.execute(
        "UPDATE diagrams SET title = ?, content = ?, updated_at = ?, tags = ? WHERE id = ?",
        (title, content, now, tags, diagram_id)
    )
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success

def get_diagram(diagram_id: int) -> Optional[Dict[str, Any]]:
    """
    Get a diagram by ID.
    
    Args:
        diagram_id: The ID of the diagram to retrieve
        
    Returns:
        A dictionary with the diagram data or None if not found
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM diagrams WHERE id = ?", (diagram_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row:
        return dict(row)
    return None

def get_all_diagrams() -> List[Dict[str, Any]]:
    """
    Get all diagrams.
    
    Returns:
        A list of dictionaries containing diagram data
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM diagrams ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    
    conn.close()
    
    return [dict(row) for row in rows]

def search_diagrams(query: str) -> List[Dict[str, Any]]:
    """
    Search for diagrams by title or tags.
    
    Args:
        query: The search query
        
    Returns:
        A list of dictionaries containing diagram data
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    search_param = f"%{query}%"
    cursor.execute(
        "SELECT * FROM diagrams WHERE title LIKE ? OR tags LIKE ? ORDER BY updated_at DESC",
        (search_param, search_param)
    )
    rows = cursor.fetchall()
    
    conn.close()
    
    return [dict(row) for row in rows]

def delete_diagram(diagram_id: int) -> bool:
    """
    Delete a diagram by ID.
    
    Args:
        diagram_id: The ID of the diagram to delete
        
    Returns:
        True if the deletion was successful, False otherwise
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM diagrams WHERE id = ?", (diagram_id,))
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return success
