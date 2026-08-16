# Modelo de dados

O esquema inicial está em `packages/database/src/schema.sql` e inclui devices, sync_sessions, raw_packets, sensor_samples, data_gaps e app_settings.

## Invariantes

- timestamps ISO-8601 em UTC;
- IDs determinísticos para deduplicação;
- HR plausível entre 20 e 260 bpm;
- amostras impossíveis, CRC inválido e tempo regressivo geram anomalia, não descarte silencioso;
- dados de alta frequência não entram diretamente em Sheets;
- `MOCK` nunca é misturado com `MEASURED` sem um campo de proveniência visível.
