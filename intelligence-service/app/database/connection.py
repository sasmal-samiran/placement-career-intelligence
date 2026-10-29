import sqlite3
from contextlib import contextmanager
from collections.abc import Iterator
from project_config.essential import DB_Path

@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_Path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")

    try: 
        yield conn
    finally:
        conn.close()
