from __future__ import annotations

import asyncio
import json
from typing import Any


# Research hints copied from an external Linux capture source in this repository.
# They are not claims of WHOOP MG compatibility and are never used for writes.
SERVICE_HINTS = {
    "whoop4_research": "61080001-8d6d-82b8-614a-1c8cb0f8dcc6",
    "whoop5_research": "fd4b0001-cce1-4033-93ce-002d5875f58a",
}


def bleak_available() -> bool:
    try:
        import bleak  # noqa: F401
    except ImportError:
        return False
    return True


def _device_json(device: Any, advertisement: Any = None) -> dict[str, Any]:
    services = list(getattr(advertisement, "service_uuids", None) or [])
    name = getattr(device, "name", None) or getattr(advertisement, "local_name", None)
    hints = [key for key, uuid in SERVICE_HINTS.items() if uuid.lower() in {s.lower() for s in services}]
    if name and "whoop" in name.lower() and not hints:
        hints.append("name_only_research_hint")
    return {"address": getattr(device, "address", None), "name": name, "rssi": getattr(advertisement, "rssi", None), "service_uuids": services, "research_hints": hints, "read_only": True}


async def scan(timeout: float = 8.0) -> list[dict[str, Any]]:
    if not bleak_available():
        raise RuntimeError("BLEAK_NOT_INSTALLED")
    from bleak import BleakScanner

    found: dict[str, dict[str, Any]] = {}

    def callback(device: Any, advertisement: Any) -> None:
        item = _device_json(device, advertisement)
        if item["address"]:
            found[item["address"]] = item

    scanner = BleakScanner(detection_callback=callback)
    await scanner.start()
    await asyncio.sleep(timeout)
    await scanner.stop()
    return sorted(found.values(), key=lambda item: item.get("name") or item.get("address") or "")


def scan_json(timeout: float = 8.0) -> str:
    return json.dumps(asyncio.run(scan(timeout)), ensure_ascii=False, indent=2)
