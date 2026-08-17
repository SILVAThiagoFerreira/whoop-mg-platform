PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, model TEXT, generation TEXT, firmware TEXT, serial TEXT, battery_percent REAL, last_seen_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sync_sessions (id TEXT PRIMARY KEY, device_id TEXT, started_at TEXT NOT NULL, ended_at TEXT, status TEXT NOT NULL, last_successful_sync TEXT, last_packet_timestamp TEXT, last_sample_timestamp TEXT, last_history_cursor TEXT, device_clock TEXT, host_clock TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS raw_packets (id TEXT PRIMARY KEY, session_id TEXT, device_id TEXT, captured_at TEXT NOT NULL, characteristic_uuid TEXT, packet_type TEXT, payload_hex TEXT NOT NULL, payload_length INTEGER NOT NULL, crc_status TEXT, direction TEXT, decoded_status TEXT DEFAULT 'UNKNOWN');
CREATE TABLE IF NOT EXISTS sensor_samples (id TEXT PRIMARY KEY, device_id TEXT, metric TEXT NOT NULL, value REAL, unit TEXT, timestamp TEXT NOT NULL, start_time TEXT, end_time TEXT, source TEXT NOT NULL, source_type TEXT NOT NULL, source_packet TEXT, quality TEXT, confidence REAL, is_derived INTEGER NOT NULL DEFAULT 0, algorithm_name TEXT, algorithm_version TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS data_gaps (id TEXT PRIMARY KEY, device_id TEXT, metric TEXT, start_time TEXT NOT NULL, end_time TEXT NOT NULL, reason TEXT NOT NULL, severity TEXT NOT NULL, detected_at TEXT NOT NULL, resolved_at TEXT);
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_samples_metric_time ON sensor_samples(metric, timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_captured ON raw_packets(captured_at);

-- Local-first foundation. These tables are additive to the original collector schema.
-- RAW documents are immutable application inputs; observations are the canonical projection.
CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imports (
    import_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_cursor TEXT,
    source_uri TEXT,
    sha256 TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error TEXT
);

CREATE TABLE IF NOT EXISTS raw_documents (
    raw_id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL REFERENCES imports(import_id),
    source TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    content_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    schema_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
    observation_id TEXT PRIMARY KEY,
    metric TEXT NOT NULL,
    value REAL,
    unit TEXT,
    timestamp_utc TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    source TEXT NOT NULL,
    device TEXT,
    quality TEXT NOT NULL DEFAULT 'UNKNOWN',
    confidence REAL,
    session_id TEXT,
    import_id TEXT REFERENCES imports(import_id),
    raw_id TEXT REFERENCES raw_documents(raw_id),
    schema_version TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_issues (
    issue_id TEXT PRIMARY KEY,
    observation_id TEXT,
    import_id TEXT,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    details_json TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_cursors (
    source TEXT PRIMARY KEY,
    cursor TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS baseline_snapshots (
    baseline_id TEXT PRIMARY KEY,
    metric TEXT NOT NULL,
    window_days INTEGER NOT NULL,
    as_of_utc TEXT NOT NULL,
    sample_count INTEGER NOT NULL,
    mean REAL,
    median REAL,
    mad REAL,
    standard_deviation REAL,
    p10 REAL,
    p90 REAL,
    algorithm TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(metric, window_days, as_of_utc)
);

CREATE TABLE IF NOT EXISTS memory_items (
    memory_id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    confidence REAL,
    first_seen_utc TEXT NOT NULL,
    last_seen_utc TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS prediction_records (
    prediction_id TEXT PRIMARY KEY,
    metric TEXT NOT NULL,
    prediction_time_utc TEXT NOT NULL,
    target_time_utc TEXT NOT NULL,
    predicted_value REAL,
    actual_value REAL,
    error REAL,
    model_id TEXT NOT NULL,
    confidence REAL,
    status TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    occurred_at_utc TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_observations_metric_time ON observations(metric, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_observations_source ON observations(source);
CREATE INDEX IF NOT EXISTS idx_quality_issues_import ON quality_issues(import_id);
CREATE INDEX IF NOT EXISTS idx_baselines_metric_window ON baseline_snapshots(metric, window_days, as_of_utc);
