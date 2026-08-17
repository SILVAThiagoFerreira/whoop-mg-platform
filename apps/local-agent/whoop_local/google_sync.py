from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from contextlib import closing
from typing import Any

from .database import connect, init_db, now_utc
from .ingestion import ingest_payload


SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
METRICS_RANGE = "DAILY_METRICS!A:H"
SYNC_RANGE = "SYNC_LOG!A:F"


class GoogleSyncError(RuntimeError):
    pass


def _config() -> tuple[str, str]:
    token = os.environ.get("GOOGLE_ACCESS_TOKEN", "").strip()
    spreadsheet_id = os.environ.get("GOOGLE_SPREADSHEET_ID", "").strip()
    if not token or not spreadsheet_id:
        raise GoogleSyncError("GOOGLE_SYNC_NOT_CONFIGURED")
    return token, spreadsheet_id


def _request(method: str, url: str, token: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    body = None
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as error:
        raise GoogleSyncError("GOOGLE_SYNC_REQUEST_FAILED") from error


def _read_values(token: str, spreadsheet_id: str, value_range: str) -> list[list[str]]:
    encoded_range = urllib.parse.quote(value_range, safe="!")
    response = _request("GET", f"{SHEETS_API}/{spreadsheet_id}/values/{encoded_range}", token)
    values = response.get("values", [])
    return values if isinstance(values, list) else []


def _number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return float(value.strip().replace(",", "."))
    except ValueError:
        return None


def rows_to_records(rows: list[list[str]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row in rows[1:]:
        if len(row) < 3 or not row[0] or not row[1]:
            continue
        records.append({
            "record_id": f"sheet:{row[0]}:{row[1]}:{row[2] if len(row) > 2 else ''}",
            "timestamp": row[0],
            "metric": row[1],
            "value": _number(row[2]),
            "unit": row[3] if len(row) > 3 else None,
            "source": "google_sheet",
            "quality": row[6] if len(row) > 6 and row[6] else "UNKNOWN",
            "confidence": _number(row[7]) if len(row) > 7 else None,
        })
    return records


def _row_key(row: list[Any]) -> tuple[str, str, str, str, str]:
    padded = list(row) + [""] * 8
    return (str(padded[0]), str(padded[1]), str(padded[2]), str(padded[3]), str(padded[4]))


def _local_rows() -> list[list[Any]]:
    init_db()
    with closing(connect()) as connection:
        rows = connection.execute("SELECT timestamp_utc, metric, value, unit, source, quality, confidence FROM observations WHERE source != 'google_sheet' ORDER BY timestamp_utc, metric").fetchall()
    return [[row[0], row[1], row[2], row[3] or "", row[4], row[5] or "UNKNOWN", row[6] if row[6] is not None else ""] for row in rows]


def pull() -> dict[str, Any]:
    token, spreadsheet_id = _config()
    metric_rows = _read_values(token, spreadsheet_id, METRICS_RANGE)
    sync_rows = _read_values(token, spreadsheet_id, SYNC_RANGE)
    result = ingest_payload({"records": rows_to_records(metric_rows), "sync": sync_rows}, "google_sheet", source_cursor=sync_rows[-1][0] if len(sync_rows) > 1 and sync_rows[-1] else None, source_uri=f"google-sheets://{spreadsheet_id}/DAILY_METRICS")
    result["rows_read"] = max(len(metric_rows) - 1, 0)
    result["sync_rows_read"] = max(len(sync_rows) - 1, 0)
    return result


def push() -> dict[str, Any]:
    token, spreadsheet_id = _config()
    existing = _read_values(token, spreadsheet_id, METRICS_RANGE)
    existing_keys = {_row_key(row) for row in existing[1:]}
    pending = [row for row in _local_rows() if _row_key(row) not in existing_keys]
    if not pending:
        return {"status": "NO_CHANGES", "rows_written": 0}
    encoded_range = urllib.parse.quote(METRICS_RANGE, safe="!")
    url = f"{SHEETS_API}/{spreadsheet_id}/values/{encoded_range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS"
    response = _request("POST", url, token, {"majorDimension": "ROWS", "values": pending})
    return {"status": "COMPLETE", "rows_written": len(pending), "updated_range": response.get("updates", {}).get("updatedRange")}


def sync_once() -> dict[str, Any]:
    pulled = pull()
    pushed = push()
    return {"status": "COMPLETE", "pulled": pulled, "pushed": pushed}
