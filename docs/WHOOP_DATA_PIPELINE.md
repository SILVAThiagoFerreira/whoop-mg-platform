# Como os dados da WHOOP chegam ao site

O GitHub Pages não acessa Bluetooth, a pulseira ou o SQLite do computador. O caminho seguro é local-first:

```text
WHOOP 5.0 MG
  ↓ BLE (collector local Windows)
Collector iPhone/Windows: scan → connect → history/live → observation
  ↓
SQLite local: raw_packets + sensor_samples + checkpoints + gaps
  ↓ autenticação da Conta Google do proprietário
Drive privado da conta: raw/exports/backups
Sheets privado da conta: DAILY_METRICS + SYNC_LOG
  ↓ Apps Script HTTPS autenticado
PWA no GitHub Pages: lê somente o workspace autorizado a cada 15 s
```

## O que já está implementado

1. O PWA bloqueia o dashboard antes da autenticação.
2. O login usa Google Identity Services somente para identidade; os links/IDs do Drive ficam no Apps Script.
3. O `sub` imutável da Conta Google identifica a conta; o email não é usado como chave.
4. Na primeira leitura, o Apps Script cria uma pasta e planilha privadas por conta, com `CONFIG`, `DAILY_METRICS` e `SYNC_LOG`.
5. O Apps Script devolve o snapshot atual e até 1.500 observações históricas; o PWA atualiza a tela automaticamente.
6. O coletor nativo pode usar a ação autenticada `ingest`; `eventId` evita duplicatas em retries.
7. Logout revoga o token Google quando possível, limpa a sessão e desmonta o dashboard.

## O que depende da próxima etapa

- o collector ainda precisa validar Bluetooth, pareamento e protocolo da WHOOP 5.0 MG;
- o histórico real só será afirmado após captura no hardware;
- o host iOS precisa fornecer ao `WhoopCloudSync` um access token Google curto em memória;
- o `VITE_GOOGLE_CLIENT_ID` precisa ser criado no Google Cloud Console e configurado no build Pages.

Nenhum valor demo é misturado com dados de conta. Sem linha em `DAILY_METRICS`, o site mostra `No data yet`, não zeros ou scores inventados. Sheets é a base histórica online; telemetria segundo a segundo continua sendo responsabilidade do coletor nativo, não do Pages.
