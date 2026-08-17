from __future__ import annotations

import hashlib
import json
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .config import raw_dir
from .database import connect, init_db, now_utc


SCHEMA_VERSION = "observation.v1"


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(value: str | bytes) -> str:
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode("utf-8")).hexdigest()


def _timestamp(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    candidate = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict) and isinstance(payload.get("records"), list):
        return [item for item in payload["records"] if isinstance(item, dict)]
    if isinstance(payload, dict):
        return [payload]
    return []


def normalize_record(record: dict[str, Any], source: str, *, device: str | None = None) -> list[dict[str, Any]]:
    """Normalize canonical records and the score objects returned by WHOOP API v2.

    This function never invents physiological values. A missing field is skipped.
    """
    if "metric" in record and "timestamp" in record:
        return [dict(record, source=record.get("source", source), device=device or record.get("device"))]

    stamp = _timestamp(record.get("updated_at") or record.get("created_at") or record.get("start"))
    score = record.get("score") if isinstance(record.get("score"), dict) else record
    if not stamp or not isinstance(score, dict):
        return []
    mapping = {
        "recovery_score": ("recovery", "%"),
        "hrv_rmssd_milli": ("hrv", "ms"),
        "resting_heart_rate": ("rhr", "bpm"),
        "spo2_percentage": ("spo2", "%"),
        "skin_temp_celsius": ("skin_temperature", "°C"),
        "strain": ("strain", "score"),
        "average_heart_rate": ("heart_rate", "bpm"),
        "max_heart_rate": ("heart_rate_max", "bpm"),
    }
    output = []
    for field, (metric, unit) in mapping.items():
        value = score.get(field)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            output.append({"metric": metric, "value": float(value), "unit": unit, "timestamp": stamp, "source": source, "device": device, "quality": "MEASURED", "confidence": 1.0, "record_id": str(record.get("id") or record.get("cycle_id") or record.get("sleep_id") or "")})
    return output


def ingest_payload(payload: Any, source: str, *, source_cursor: str | None = None, source_uri: str | None = None, path: Path | None = None) -> dict[str, Any]:
    raw_json = _canonical_json(payload)
    digest = _sha256(raw_json)
    import_id = f"{source}:{digest[:24]}"
    records = [item for original in _records(payload) for item in normalize_record(original, source)]
    db = init_db()
    raw_path = path or raw_dir() / f"{import_id.replace(':', '_')}.json"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    if not raw_path.exists():
        raw_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    raw_id = f"raw:{digest}"
    inserted = 0
    issues = 0
    with closing(connect(db)) as connection:
        connection.execute(
            "INSERT OR IGNORE INTO imports(import_id, source, source_cursor, source_uri, sha256, record_count, status, started_at, completed_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (import_id, source, source_cursor, source_uri, digest, len(records), "RUNNING", now_utc(), None),
        )
        connection.execute(
            "INSERT OR IGNORE INTO raw_documents(raw_id, import_id, source, captured_at, content_type, payload_json, sha256, schema_version) VALUES(?,?,?,?,?,?,?,?)",
            (raw_id, import_id, source, now_utc(), "application/json", raw_json, digest, SCHEMA_VERSION),
        )
        for item in records:
            stamp = _timestamp(item.get("timestamp"))
            metric = item.get("metric")
            value = item.get("value")
            if not stamp or not isinstance(metric, str) or not metric or not (value is None or isinstance(value, (int, float))):
                issues += 1
                issue_id = f"issue:{uuid.uuid4()}"
                connection.execute("INSERT INTO quality_issues(issue_id, import_id, issue_type, severity, details_json, detected_at) VALUES(?,?,?,?,?,?)", (issue_id, import_id, "MALFORMED_RECORD", "ERROR", _canonical_json(item), now_utc()))
                continue
            record_id = str(item.get("record_id") or "")
            observation_id = f"{source}:{record_id}:{metric}:{stamp}" if record_id else f"{source}:{metric}:{stamp}:{_sha256(_canonical_json(item))[:12]}"
            cursor = connection.execute(
                "INSERT OR IGNORE INTO observations(observation_id, metric, value, unit, timestamp_utc, timezone, source, device, quality, confidence, import_id, raw_id, schema_version, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (observation_id, metric, value, item.get("unit"), stamp, "UTC", item.get("source", source), item.get("device"), item.get("quality", "UNKNOWN"), item.get("confidence"), import_id, raw_id, SCHEMA_VERSION, now_utc()),
            )
            inserted += cursor.rowcount
        status = "COMPLETE" if issues == 0 else "COMPLETE_WITH_ISSUES"
        connection.execute("UPDATE imports SET status=?, completed_at=? WHERE import_id=?", (status, now_utc(), import_id))
        if source_cursor:
            connection.execute("INSERT INTO sync_cursors(source, cursor, updated_at) VALUES(?,?,?) ON CONFLICT(source) DO UPDATE SET cursor=excluded.cursor, updated_at=excluded.updated_at", (source, source_cursor, now_utc()))
        connection.commit()
    return {"import_id": import_id, "raw_id": raw_id, "records": len(records), "inserted": inserted, "issues": issues, "raw_path": str(raw_path), "status": status}


def ingest_file(path: Path, source: str) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return ingest_payload(payload, source, path=path)
