export type SyncCheckpoint = { last_successful_sync: string | null; last_packet_timestamp: string | null; last_sample_timestamp: string | null; last_history_cursor: string | null; device_clock: string | null; host_clock: string | null };
export type SyncWindow = { from: string | null; to: string; reason: 'initial' | 'incremental' | 'recovery' };
export function planSyncWindow(checkpoint: SyncCheckpoint, now = new Date()): SyncWindow { return { from: checkpoint.last_sample_timestamp ?? checkpoint.last_successful_sync, to: now.toISOString(), reason: checkpoint.last_sample_timestamp || checkpoint.last_successful_sync ? 'incremental' : 'initial' }; }
export function dedupeKeys(keys: string[]): string[] { return [...new Set(keys)]; }

