export type Provenance = 'RAW' | 'MEASURED' | 'DERIVED' | 'ESTIMATED' | 'MOCK' | 'UNKNOWN';
export type Source = 'whoop_ble' | 'whoop_history' | 'whoop_realtime' | 'manual' | 'google_sheet' | 'derived';
export type CanonicalMetric = { id: string; device_id: string; metric: string; value: number | null; unit: string | null; timestamp: string; start_time?: string; end_time?: string; source: Source; source_type: Provenance; source_packet?: string; quality?: string; confidence?: number; is_derived: boolean; algorithm_name?: string; algorithm_version?: string; created_at: string; updated_at: string };
export function isPlausibleHeartRate(value: number): boolean { return Number.isFinite(value) && value >= 20 && value <= 260; }
export function canonicalId(metric: string, timestamp: string, deviceId: string): string { return `${deviceId}:${metric}:${timestamp}`; }

