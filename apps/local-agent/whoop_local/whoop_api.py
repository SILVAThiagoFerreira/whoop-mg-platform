from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from typing import Any

from .ingestion import ingest_payload


API_BASE = "https://api.prod.whoop.com/developer/v2"
TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth"
SCOPES = ("offline", "read:recovery", "read:cycles", "read:sleep", "read:workout", "read:profile", "read:body_measurement")


def authorization_url(redirect_uri: str, state: str) -> str:
    query = urllib.parse.urlencode({"client_id": os.environ.get("WHOOP_CLIENT_ID", ""), "redirect_uri": redirect_uri, "response_type": "code", "scope": " ".join(SCOPES), "state": state})
    return f"{AUTH_URL}?{query}"


def refresh_access_token() -> dict[str, Any]:
    values = {key: os.environ.get(key) for key in ("WHOOP_CLIENT_ID", "WHOOP_CLIENT_SECRET", "WHOOP_REFRESH_TOKEN")}
    if not all(values.values()):
        raise RuntimeError("WHOOP_OAUTH_NOT_CONFIGURED")
    body = urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": values["WHOOP_REFRESH_TOKEN"], "client_id": values["WHOOP_CLIENT_ID"], "client_secret": values["WHOOP_CLIENT_SECRET"]}).encode()
    request = urllib.request.Request(TOKEN_URL, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_collection(path: str, access_token: str, *, start: str | None = None, end: str | None = None, limit: int = 25) -> dict[str, Any]:
    records: list[Any] = []
    next_token: str | None = None
    while True:
        params: dict[str, Any] = {"limit": min(max(limit, 1), 25)}
        if start:
            params["start"] = start
        if end:
            params["end"] = end
        if next_token:
            params["nextToken"] = next_token
        url = f"{API_BASE}/{path.lstrip('/')}?{urllib.parse.urlencode(params)}"
        request = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
        records.extend(payload.get("records", []))
        next_token = payload.get("next_token")
        if not next_token:
            break
        time.sleep(0.25)
    return {"records": records, "source_path": path, "next_token": None}


def sync_collections(*, access_token: str | None = None, start: str | None = None, end: str | None = None) -> list[dict[str, Any]]:
    token = access_token or os.environ.get("WHOOP_ACCESS_TOKEN") or refresh_access_token().get("access_token")
    results = []
    for endpoint, source in (("cycle", "whoop_api_cycle"), ("recovery", "whoop_api_recovery"), ("sleep", "whoop_api_sleep"), ("workout", "whoop_api_workout")):
        payload = fetch_collection(endpoint, token, start=start, end=end)
        results.append(ingest_payload(payload, source, source_uri=f"whoop://v2/{endpoint}"))
    return results
