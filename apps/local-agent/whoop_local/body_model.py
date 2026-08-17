from __future__ import annotations

import math
import statistics
from contextlib import closing
from datetime import datetime, timedelta, timezone
from typing import Any

from .database import connect, init_db, now_utc


def baseline(metric: str, window_days: int, *, as_of: datetime | None = None) -> dict[str, Any]:
    init_db()
    end = as_of or datetime.now(timezone.utc)
    start = end - timedelta(days=window_days)
    with closing(connect()) as connection:
        rows = connection.execute("SELECT value FROM observations WHERE metric=? AND timestamp_utc >= ? AND timestamp_utc <= ? AND value IS NOT NULL ORDER BY timestamp_utc", (metric, start.isoformat().replace("+00:00", "Z"), end.isoformat().replace("+00:00", "Z"))).fetchall()
    values = [float(row[0]) for row in rows if math.isfinite(float(row[0]))]
    med = statistics.median(values) if values else None
    mad = statistics.median([abs(value - med) for value in values]) if med is not None else None
    result = {"metric": metric, "window_days": window_days, "as_of_utc": end.isoformat().replace("+00:00", "Z"), "sample_count": len(values), "mean": statistics.fmean(values) if values else None, "median": med, "mad": mad, "standard_deviation": statistics.pstdev(values) if len(values) > 1 else (0.0 if values else None), "p10": _percentile(values, 0.10), "p90": _percentile(values, 0.90), "algorithm": "mean_median_mad_pstdev_v1"}
    baseline_id = f"{metric}:{window_days}:{result['as_of_utc']}"
    with closing(connect()) as connection:
        connection.execute("INSERT OR REPLACE INTO baseline_snapshots(baseline_id, metric, window_days, as_of_utc, sample_count, mean, median, mad, standard_deviation, p10, p90, algorithm, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (baseline_id, metric, window_days, result["as_of_utc"], result["sample_count"], result["mean"], result["median"], result["mad"], result["standard_deviation"], result["p10"], result["p90"], result["algorithm"], now_utc()))
        connection.commit()
    return result


def _percentile(values: list[float], probability: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)
