import sqlite3
import json

# Connect to the database
conn = sqlite3.connect("diagrams.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get all diagrams
cursor.execute("SELECT * FROM diagrams")
rows = cursor.fetchall()

# Convert to list of dictionaries for JSON output
diagrams = [dict(row) for row in rows]

# Print as JSON
print(json.dumps(diagrams, indent=2))

# Close connection
conn.close()
