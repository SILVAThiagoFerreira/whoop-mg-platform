from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "local-agent"))

from whoop_local.body_model import baseline
from whoop_local.database import counts
from whoop_local.ingestion import ingest_file
from whoop_local.google_sync import rows_to_records


class LocalAgentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.db = Path(self.temp.name) / "test.db"
        self.raw = Path(self.temp.name) / "raw"
        self.old_db = os.environ.get("WHOOP_DATABASE_PATH")
        self.old_raw = os.environ.get("WHOOP_RAW_DIR")
        os.environ["WHOOP_DATABASE_PATH"] = str(self.db)
        os.environ["WHOOP_RAW_DIR"] = str(self.raw)

    def tearDown(self) -> None:
        if self.old_db is None:
            os.environ.pop("WHOOP_DATABASE_PATH", None)
        else:
            os.environ["WHOOP_DATABASE_PATH"] = self.old_db
        if self.old_raw is None:
            os.environ.pop("WHOOP_RAW_DIR", None)
        else:
            os.environ["WHOOP_RAW_DIR"] = self.old_raw
        self.temp.cleanup()

    def test_ingestion_is_idempotent_and_preserves_raw(self) -> None:
        fixture = Path(__file__).parent / "fixtures" / "whoop_api_sample.json"
        first = ingest_file(fixture, "whoop_api_recovery")
        second = ingest_file(fixture, "whoop_api_recovery")
        self.assertEqual(first["inserted"], 9)
        self.assertEqual(second["inserted"], 0)
        self.assertEqual(counts()["observations"], 9)
        self.assertEqual(counts()["raw_documents"], 1)

    def test_baseline_reports_personal_statistics(self) -> None:
        fixture = Path(__file__).parent / "fixtures" / "whoop_api_sample.json"
        ingest_file(fixture, "whoop_api_recovery")
        result = baseline("hrv", 28)
        self.assertEqual(result["sample_count"], 3)
        self.assertEqual(result["median"], 64.0)
        self.assertEqual(result["mad"], 2.0)

    def test_google_rows_become_provenance_aware_records(self) -> None:
        records = rows_to_records([
            ["timestamp", "metric", "value", "unit", "source", "source_type", "quality", "confidence"],
            ["2026-08-17T08:00:00Z", "hrv", "66", "ms", "google_sheet", "MEASURED", "GOOD", "1"],
        ])
        self.assertEqual(records[0]["metric"], "hrv")
        self.assertEqual(records[0]["value"], 66.0)
        self.assertEqual(records[0]["source"], "google_sheet")


if __name__ == "__main__":
    unittest.main()
