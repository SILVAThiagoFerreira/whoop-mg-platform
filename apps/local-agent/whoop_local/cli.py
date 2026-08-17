from __future__ import annotations

import argparse
from contextlib import closing
import json
import os
import platform
import shutil
import sqlite3
import subprocess
import sys
import urllib.request
from pathlib import Path

from .ble import bleak_available, scan
from .body_model import baseline
from .config import database_path, log_dir, raw_dir
from .database import counts, init_db
from .ingestion import ingest_file
from .google_sync import pull as google_pull, push as google_push, sync_once as google_sync
from .whoop_api import authorization_url, sync_collections


def _json(value: object) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2, default=str))


def doctor() -> int:
    db = init_db()
    gpu = "NOT_FOUND"
    nvidia = shutil.which("nvidia-smi")
    if nvidia:
        result = subprocess.run([nvidia, "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"], capture_output=True, text=True, check=False)
        gpu = result.stdout.strip() or "PRESENT_BUT_UNREADABLE"
    ollama = "NOT_REACHABLE"
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=1):
            ollama = "READY"
    except Exception:
        pass
    _json({"system": platform.platform(), "python": sys.version.split()[0], "sqlite": sqlite3.sqlite_version, "node": bool(shutil.which("node")), "npm": bool(shutil.which("npm")), "git": bool(shutil.which("git")), "rust": bool(shutil.which("cargo")), "docker": bool(shutil.which("docker")), "wsl": bool(shutil.which("wsl")), "bluetooth": "BLEAK_INSTALLED" if bleak_available() else "BLEAK_NOT_INSTALLED", "gpu": gpu, "ollama": ollama, "database": str(db), "database_exists": db.exists(), "raw_dir": str(raw_dir()), "logs_dir": str(log_dir()), "counts": counts(db), "status": "NOMINAL_LOCAL_FOUNDATION"})
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="whoop-local")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("doctor")
    scan_parser = sub.add_parser("scan")
    scan_parser.add_argument("--timeout", type=float, default=8.0)
    sub.add_parser("devices")
    inspect_parser = sub.add_parser("inspect")
    inspect_parser.add_argument("--address")
    sub.add_parser("connect")
    sub.add_parser("capture")
    sub.add_parser("status")
    sync_parser = sub.add_parser("sync")
    sync_parser.add_argument("--start")
    sync_parser.add_argument("--end")
    ingest_parser = sub.add_parser("ingest")
    ingest_parser.add_argument("path", type=Path)
    ingest_parser.add_argument("--source", default="file_import")
    baseline_parser = sub.add_parser("baseline")
    baseline_parser.add_argument("metric")
    baseline_parser.add_argument("--window", type=int, default=28)
    auth_parser = sub.add_parser("api-auth-url")
    auth_parser.add_argument("--redirect-uri", required=True)
    auth_parser.add_argument("--state", required=True)
    sub.add_parser("google-pull")
    sub.add_parser("google-push")
    sub.add_parser("google-sync")
    args = parser.parse_args(argv)
    if args.command == "doctor":
        return doctor()
    if args.command == "scan":
        try:
            _json(__import__("asyncio").run(scan(args.timeout)))
            return 0
        except RuntimeError as error:
            _json({"status": "BLOCKED", "reason": str(error), "action": "python -m pip install bleak"})
            return 2
    if args.command in {"connect", "capture"}:
        _json({"status": "BLOCKED", "reason": "READ_ONLY_DISCOVERY_FIRST", "detail": "No GATT writes, clock changes, offload commands, firmware or calibration operations are enabled in P0."})
        return 2
    if args.command == "inspect":
        _json({"status": "USE_SCAN", "address": args.address, "service_hints": {"whoop4_research": "61080001-8d6d-82b8-614a-1c8cb0f8dcc6", "whoop5_research": "fd4b0001-cce1-4033-93ce-002d5875f58a"}, "note": "Research hints from the local NOOP source; not validated for WHOOP MG."})
        return 0
    if args.command == "devices":
        init_db()
        with closing(sqlite3.connect(database_path())) as connection:
            rows = [dict(zip(("id", "model", "generation", "firmware", "last_seen_at"), row)) for row in connection.execute("SELECT id, model, generation, firmware, last_seen_at FROM devices ORDER BY last_seen_at DESC")]
        _json(rows)
        return 0
    if args.command == "status":
        _json({"database": str(database_path()), "counts": counts()})
        return 0
    if args.command == "ingest":
        _json(ingest_file(args.path, args.source))
        return 0
    if args.command == "baseline":
        _json(baseline(args.metric, args.window))
        return 0
    if args.command == "api-auth-url":
        _json({"url": authorization_url(args.redirect_uri, args.state), "scopes": "offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement"})
        return 0
    if args.command in {"google-pull", "google-push", "google-sync"}:
        try:
            operation = {"google-pull": google_pull, "google-push": google_push, "google-sync": google_sync}[args.command]
            _json(operation())
            return 0
        except Exception as error:
            _json({"status": "BLOCKED", "reason": str(error), "required": ["GOOGLE_ACCESS_TOKEN", "GOOGLE_SPREADSHEET_ID"], "detail": "The local agent is the trusted sync client; Pages still has no Drive/Sheets capability."})
            return 2
    if args.command == "sync":
        try:
            _json(sync_collections(start=args.start, end=args.end))
            return 0
        except Exception as error:
            _json({"status": "BLOCKED", "reason": str(error), "required": ["WHOOP_ACCESS_TOKEN or WHOOP_CLIENT_ID + WHOOP_CLIENT_SECRET + WHOOP_REFRESH_TOKEN"]})
            return 2
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
