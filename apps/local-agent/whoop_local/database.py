from __future__ import annotations

import sqlite3
import os
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from .config import database_path


SCHEMA_PATH = Path(os.getenv("WHOOP_SCHEMA_PATH", str(Path(__file__).resolve().parents[3] / "packages" / "database" / "src" / "schema.sql")))


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def connect(path: Path | None = None) -> sqlite3.Connection:
    db = path or database_path()
    db.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_db(path: Path | None = None) -> Path:
    db = path or database_path()
    with closing(connect(db)) as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        connection.execute(
            "INSERT INTO schema_meta(key, value, updated_at) VALUES('schema_version', '0.2.0', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (now_utc(),),
        )
        connection.commit()
    return db


def counts(path: Path | None = None) -> dict[str, int]:
    init_db(path)
    with closing(connect(path)) as connection:
        return {
            "observations": connection.execute("SELECT COUNT(*) FROM observations").fetchone()[0],
            "sensor_samples": connection.execute("SELECT COUNT(*) FROM sensor_samples").fetchone()[0],
            "raw_documents": connection.execute("SELECT COUNT(*) FROM raw_documents").fetchone()[0],
            "raw_packets": connection.execute("SELECT COUNT(*) FROM raw_packets").fetchone()[0],
            "imports": connection.execute("SELECT COUNT(*) FROM imports").fetchone()[0],
            "devices": connection.execute("SELECT COUNT(*) FROM devices").fetchone()[0],
        }
