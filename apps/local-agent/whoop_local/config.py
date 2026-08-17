from __future__ import annotations

import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def project_path(value: str | None, default: Path) -> Path:
    path = Path(value) if value else default
    return path if path.is_absolute() else PROJECT_ROOT / path


def database_path() -> Path:
    return project_path(os.getenv("WHOOP_DATABASE_PATH"), PROJECT_ROOT / "data" / "whoop.db")


def raw_dir() -> Path:
    return project_path(os.getenv("WHOOP_RAW_DIR"), PROJECT_ROOT / "data" / "raw")


def log_dir() -> Path:
    return project_path(os.getenv("WHOOP_LOG_DIR"), PROJECT_ROOT / "logs")
