import sqlite3
import shutil
import os

# 1. Clear SQLite Database (Keeps the schema, deletes the rows)
def clear_sqlite():
    print("Clearing SQLite database...")
    conn = sqlite3.connect('recruit.db') # Update with your actual DB filename
    cursor = conn.cursor()
    
    # Disable foreign keys temporarily so we can truncate
    cursor.execute("PRAGMA foreign_keys = OFF;")
    cursor.execute("DELETE FROM candidates;")
    cursor.execute("DELETE FROM jobs;")
    # Add any other tables like 'assessment_checkpoints' if needed
    
    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.commit()
    conn.close()
    print("✓ SQLite tables emptied.")

# 2. Clear Uploaded Resumes
def clear_uploads():
    print("Clearing uploads folder...")
    upload_dir = "./uploads"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)
    print("✓ Uploads folder reset.")

# 3. Clear ChromaDB Vector Store
def clear_chroma():
    print("Clearing ChromaDB...")
    chroma_dir = "./chroma_db" # Update if your Chroma path is different
    if os.path.exists(chroma_dir):
        shutil.rmtree(chroma_dir)
        print("✓ ChromaDB state deleted.")

if __name__ == "__main__":
    print("--- Starting Demo Reset ---")
    clear_sqlite()
    clear_uploads()
    clear_chroma()
    print("--- Reset Complete! Ready for Demo. ---")