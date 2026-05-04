"""
Reset cache and candidates without deleting the DB file.
Run while uvicorn is stopped. Safe to use repeatedly.
"""
import sqlite3
import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
DB_PATH = BACKEND_DIR / "recruit.db"
CHROMA_DIR = BACKEND_DIR / "chroma_db"  # adjust if your folder is named differently

# 1. Wipe relevant tables, keep schema
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("DELETE FROM match_score_cache;")
cur.execute("DELETE FROM candidates;")
cur.execute("DELETE FROM jobs;")
conn.commit()
conn.close()
print("✓ Cleared match_score_cache, candidates, jobs tables")

# 2. Wipe ChromaDB (force fresh)
if CHROMA_DIR.exists():
    shutil.rmtree(CHROMA_DIR)
    print(f"✓ Deleted {CHROMA_DIR}")
else:
    print(f"  {CHROMA_DIR} not found, skipping")

print("\nDone. Restart uvicorn — it will recreate empty tables and ChromaDB.")