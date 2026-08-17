from __future__ import annotations

import json
import os
import sqlite3
import asyncio
import urllib.error
import urllib.parse
import urllib.request
from contextlib import closing
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from ipaddress import ip_address
from typing import Any

from .ble import bleak_available, scan
from .config import database_path
from .database import connect, counts, init_db
from .google_sync import sync_once as google_sync


MODEL = os.getenv("WHOOP_COACH_MODEL", "whoop-coach:0.1")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
GOOGLE_CLIENT_ID = os.getenv("WHOOP_GOOGLE_CLIENT_ID", "").strip()
DEFAULT_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://silvathiagoferreira.github.io",
}


def allowed_origins() -> set[str]:
    configured = os.getenv("WHOOP_COACH_ALLOWED_ORIGINS", "")
    return {item.strip() for item in configured.split(",") if item.strip()} or DEFAULT_ORIGINS


def local_client(address: str) -> bool:
    try:
        return ip_address(address).is_loopback
    except ValueError:
        return False


def body_context() -> dict[str, Any]:
    init_db()
    with closing(sqlite3.connect(database_path())) as connection:
        count = connection.execute("SELECT COUNT(*) FROM observations").fetchone()[0]
        rows = connection.execute(
            "SELECT metric, value, unit, timestamp_utc, quality, source "
            "FROM observations ORDER BY timestamp_utc DESC LIMIT 40"
        ).fetchall()
    latest: dict[str, dict[str, Any]] = {}
    for metric, value, unit, timestamp, quality, source in rows:
        latest.setdefault(
            metric,
            {
                "metric": metric,
                "value": value,
                "unit": unit,
                "timestamp_utc": timestamp,
                "quality": quality,
                "source": source,
            },
        )
    return {"observation_count": count, "latest_metrics": list(latest.values())}


def dashboard_snapshot() -> dict[str, Any]:
    """Return a read-only local projection for both desktop and web clients."""
    init_db()
    context = body_context()
    with closing(connect()) as connection:
        baselines = [
            dict(row)
            for row in connection.execute(
                """SELECT metric, window_days, sample_count, mean, median, mad,
                          standard_deviation, p10, p90, as_of_utc
                     FROM baseline_snapshots
                    ORDER BY as_of_utc DESC, window_days ASC
                    LIMIT 80"""
            ).fetchall()
        ]
        last_session = connection.execute(
            """SELECT id, status, started_at, ended_at, last_sample_timestamp, error
                 FROM sync_sessions ORDER BY started_at DESC LIMIT 1"""
        ).fetchone()
    return {
        "model": MODEL,
        "observation_count": context["observation_count"],
        "latest_metrics": context["latest_metrics"],
        "baselines": baselines,
        "last_sync": dict(last_session) if last_session else None,
        "google_sync_configured": bool(os.getenv("GOOGLE_ACCESS_TOKEN", "").strip() and os.getenv("GOOGLE_SPREADSHEET_ID", "").strip()),
        "data_owner": "local_pc",
        "ble_offload_status": "not_implemented",
    }


def local_status() -> dict[str, Any]:
    context = body_context()
    return {
        "observation_count": context["observation_count"],
        "device_count": counts().get("devices", 0),
        "ble_available": bleak_available(),
        "database": "READY",
    }


def verify_google_access_token(token: str) -> str:
    if not token or not GOOGLE_CLIENT_ID:
        raise ValueError("AUTH_REQUIRED")
    query = urllib.parse.urlencode({"access_token": token})
    request = urllib.request.Request(f"https://oauth2.googleapis.com/tokeninfo?{query}")
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as error:
        raise ValueError("AUTH_INVALID") from error
    if payload.get("aud") != GOOGLE_CLIENT_ID or not payload.get("sub"):
        raise ValueError("AUTH_INVALID")
    return str(payload["sub"])


def call_ollama(messages: list[dict[str, str]]) -> str:
    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.15, "num_ctx": 8192, "num_predict": 240},
    }
    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError("OLLAMA_UNAVAILABLE") from error
    message = result.get("message") or {}
    text = str(message.get("content") or result.get("response") or "").strip()
    if not text:
        raise RuntimeError("OLLAMA_EMPTY_RESPONSE")
    return text


def coach_reply(message: str, history: list[dict[str, str]]) -> dict[str, Any]:
    context = body_context()
    system = (
        "Você é o Whoop Coach, assistente fisiológico privado. "
        "Use somente o contexto fornecido. Não invente dados, não diagnostique "
        "e diferencie observação, associação, hipótese e previsão. "
        "Se não houver dados pessoais suficientes, diga isso claramente. "
        "Responda em português claro e de forma concisa. Para perguntas simples, use no máximo 3 frases. "
        "Só aprofunde quando o usuário pedir detalhes. Não repita a pergunta nem faça introduções longas.\n\n"
        f"Contexto local atual: {json.dumps(context, ensure_ascii=False)}"
    )
    safe_history = [
        {"role": item.get("role", "user"), "content": str(item.get("content", ""))[:4000]}
        for item in history[-6:]
        if item.get("role") in {"user", "assistant"} and item.get("content")
    ]
    reply = call_ollama([{"role": "system", "content": system}, *safe_history, {"role": "user", "content": message[:4000]}])
    return {
        "reply": reply,
        "model": MODEL,
        "local": True,
        "data_used": context["observation_count"] > 0,
        "observation_count": context["observation_count"],
    }


class CoachHandler(BaseHTTPRequestHandler):
    server_version = "WhoopCoachLocal/0.1"

    def log_message(self, format: str, *args: object) -> None:
        return

    def _origin_ok(self) -> bool:
        origin = self.headers.get("Origin", "")
        return not origin or origin in allowed_origins() or (origin == "null" and local_client(self.client_address[0]))

    def _authorized(self, payload: dict[str, Any]) -> str | None:
        client = self.client_address[0]
        if local_client(client) and not GOOGLE_CLIENT_ID:
            return "local"
        return verify_google_access_token(str(payload.get("accessToken", "")))

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        origin = self.headers.get("Origin", "")
        self.send_response(status)
        if origin in allowed_origins():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self._origin_ok():
            self._send(HTTPStatus.FORBIDDEN, {"error": "ORIGIN_NOT_ALLOWED"})
            return
        self._send(HTTPStatus.NO_CONTENT, {})

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") == "/health":
            self._send(HTTPStatus.OK, {"ok": True, "service": "whoop-coach", "model": MODEL, **local_status()})
            return
        if self.path.rstrip("/") == "/dashboard":
            if not local_client(self.client_address[0]):
                self._send(HTTPStatus.FORBIDDEN, {"error": "LOCAL_ONLY"})
                return
            self._send(HTTPStatus.OK, dashboard_snapshot())
            return
        if self.path.rstrip("/") == "/sync/status":
            if not local_client(self.client_address[0]):
                self._send(HTTPStatus.FORBIDDEN, {"error": "LOCAL_ONLY"})
                return
            snapshot = dashboard_snapshot()
            self._send(HTTPStatus.OK, {"last_sync": snapshot["last_sync"], "google_sync_configured": snapshot["google_sync_configured"], "ble_offload_status": snapshot["ble_offload_status"]})
            return
        self._send(HTTPStatus.NOT_FOUND, {"error": "NOT_FOUND"})

    def do_POST(self) -> None:  # noqa: N802
        if not self._origin_ok():
            self._send(HTTPStatus.FORBIDDEN, {"error": "ORIGIN_NOT_ALLOWED"})
            return
        if self.path.rstrip("/") != "/chat":
            if self.path.rstrip("/") == "/sync/google":
                if not local_client(self.client_address[0]):
                    self._send(HTTPStatus.FORBIDDEN, {"error": "LOCAL_ONLY"})
                    return
                try:
                    result = google_sync()
                    self._send(HTTPStatus.OK, {"result": result, "dashboard": dashboard_snapshot()})
                except Exception as error:
                    self._send(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)[:160], "status": "BLOCKED"})
                return
            if self.path.rstrip("/") == "/scan":
                if not local_client(self.client_address[0]):
                    self._send(HTTPStatus.FORBIDDEN, {"error": "LOCAL_ONLY"})
                    return
                try:
                    devices = asyncio.run(scan(timeout=6.0))
                except Exception as error:  # BLE backends can fail with platform-specific exceptions.
                    self._send(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "BLE_SCAN_FAILED", "detail": str(error)[:240]})
                    return
                self._send(HTTPStatus.OK, {"devices": devices, "read_only": True})
                return
            self._send(HTTPStatus.NOT_FOUND, {"error": "NOT_FOUND"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 64_000:
            self._send(HTTPStatus.BAD_REQUEST, {"error": "PAYLOAD_TOO_LARGE"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict) or not str(payload.get("message", "")).strip():
                raise ValueError("MESSAGE_REQUIRED")
            self._authorized(payload)
            result = coach_reply(str(payload["message"]).strip(), payload.get("history", []))
            self._send(HTTPStatus.OK, result)
        except ValueError as error:
            self._send(HTTPStatus.UNAUTHORIZED if str(error) in {"AUTH_REQUIRED", "AUTH_INVALID"} else HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except RuntimeError as error:
            self._send(HTTPStatus.SERVICE_UNAVAILABLE, {"error": str(error)})
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send(HTTPStatus.BAD_REQUEST, {"error": "INVALID_JSON"})


def serve(host: str = "127.0.0.1", port: int = 8765) -> None:
    server = ThreadingHTTPServer((host, port), CoachHandler)
    print(f"Whoop Coach local API: http://{host}:{port}", flush=True)
    server.serve_forever()
