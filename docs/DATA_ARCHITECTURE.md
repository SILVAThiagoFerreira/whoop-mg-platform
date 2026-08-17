# Data Architecture

```text
RAW → VALIDATED → NORMALIZED → PROCESSED → FEATURES → ANALYTICS → MODELS → INSIGHTS
```

O P0 implementa RAW, validação básica, normalização e observações. Camadas posteriores só podem consumir `observations` com proveniência explícita.

Fontes suportadas: `whoop_ble`, `whoop_api_*`, `file_import`, `manual`, `calculated`. Qualidade e confiança acompanham cada observação. Dados MOCK nunca são misturados com MEASURED.

`import_id` usa hash do payload; `observation_id` combina fonte, identificador do registro, métrica e timestamp. Reprocessar o mesmo JSON não duplica observações.
