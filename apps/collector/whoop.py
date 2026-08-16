"""Safe WHOOP collector scaffold. Real protocol support is intentionally gated by evidence."""
from __future__ import annotations
import argparse, asyncio, json, os, platform, shutil, sqlite3, sys, uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = Path(os.getenv("WHOOP_DATABASE_PATH", ROOT / "data" / "whoop.db"))
SCHEMA = ROOT / "packages" / "database" / "src" / "schema.sql"
def now(): return datetime.now(timezone.utc).isoformat()
def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as conn: conn.executescript(SCHEMA.read_text(encoding="utf-8"))
def doctor():
    init_db(); print(json.dumps({"bluetooth": "unknown", "platform": platform.platform(), "python": sys.version.split()[0], "database": str(DB), "database_exists": DB.exists(), "bleak": _has_bleak(), "protocol": "EXPERIMENTAL", "status": "ready_for_hardware_validation"}, indent=2))
def _has_bleak():
    try: import bleak  # noqa: F401
    except ImportError: return False
    return True
async def scan():
    if not _has_bleak(): print("Bleak não instalado; nenhum scan executado. Instale-o somente para testar o adaptador."); return
    from bleak import BleakScanner
    devices = await BleakScanner.discover(timeout=8)
    for d in devices: print(f"{d.address}\t{d.name or 'Unnamed'}")
def status():
    init_db()
    with sqlite3.connect(DB) as conn: print(json.dumps({"db": str(DB), "devices": conn.execute("select count(*) from devices").fetchone()[0], "samples": conn.execute("select count(*) from sensor_samples").fetchone()[0], "raw_packets": conn.execute("select count(*) from raw_packets").fetchone()[0]}, indent=2))
def sync():
    init_db(); session = str(uuid.uuid4())
    with sqlite3.connect(DB) as conn: conn.execute("insert into sync_sessions(id,started_at,status,error) values(?,?,?,?)", (session, now(), "BLOCKED", "Collector ainda não validado no hardware/protocolo WHOOP 5.0 MG"))
    print(json.dumps({"session_id": session, "status": "BLOCKED", "reason": "hardware_or_protocol_not_validated"}, indent=2))
def main():
    parser = argparse.ArgumentParser(prog="whoop", description="WHOOP MG Lab collector")
    parser.add_argument("command", choices=["doctor", "scan", "status", "sync", "history", "battery", "connect", "inspect", "export"])
    args = parser.parse_args()
    if args.command == "doctor": doctor()
    elif args.command == "scan": asyncio.run(scan())
    elif args.command == "status": status()
    elif args.command == "sync": sync()
    else: print(json.dumps({"command": args.command, "status": "NOT_IMPLEMENTED", "reason": "protocol_validation_required"}, indent=2))
if __name__ == "__main__": main()

