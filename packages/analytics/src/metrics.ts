export type MetricPoint = { timestamp: string; value: number | null; quality?: string };
export function mean(points: MetricPoint[]): number | null { const values = points.map(p => p.value).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
export function standardDeviation(points: MetricPoint[]): number | null { const avg = mean(points); if (avg === null) return null; const values = points.map(p => p.value).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)); return Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length); }
export const algorithmMetadata = { name: 'WHOOP_MG_LAB_BASELINES', version: '0.1.0', status: 'EXPERIMENTAL', limitations: 'Não reproduz algoritmos proprietários da WHOOP.' } as const;

