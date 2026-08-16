PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, model TEXT, generation TEXT, firmware TEXT, serial TEXT, battery_percent REAL, last_seen_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sync_sessions (id TEXT PRIMARY KEY, device_id TEXT, started_at TEXT NOT NULL, ended_at TEXT, status TEXT NOT NULL, last_successful_sync TEXT, last_packet_timestamp TEXT, last_sample_timestamp TEXT, last_history_cursor TEXT, device_clock TEXT, host_clock TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS raw_packets (id TEXT PRIMARY KEY, session_id TEXT, device_id TEXT, captured_at TEXT NOT NULL, characteristic_uuid TEXT, packet_type TEXT, payload_hex TEXT NOT NULL, payload_length INTEGER NOT NULL, crc_status TEXT, direction TEXT, decoded_status TEXT DEFAULT 'UNKNOWN');
CREATE TABLE IF NOT EXISTS sensor_samples (id TEXT PRIMARY KEY, device_id TEXT, metric TEXT NOT NULL, value REAL, unit TEXT, timestamp TEXT NOT NULL, start_time TEXT, end_time TEXT, source TEXT NOT NULL, source_type TEXT NOT NULL, source_packet TEXT, quality TEXT, confidence REAL, is_derived INTEGER NOT NULL DEFAULT 0, algorithm_name TEXT, algorithm_version TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS data_gaps (id TEXT PRIMARY KEY, device_id TEXT, metric TEXT, start_time TEXT NOT NULL, end_time TEXT NOT NULL, reason TEXT NOT NULL, severity TEXT NOT NULL, detected_at TEXT NOT NULL, resolved_at TEXT);
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_samples_metric_time ON sensor_samples(metric, timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_captured ON raw_packets(captured_at);

