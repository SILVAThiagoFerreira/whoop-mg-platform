# Como os dados da WHOOP chegam ao site

O GitHub Pages não acessa Bluetooth, a pulseira ou o SQLite do computador. O caminho seguro é local-first:

```text
WHOOP 5.0 MG
  ↓ BLE (collector local Windows)
Collector: scan → connect → history/live → raw packet
  ↓
SQLite local: raw_packets + sensor_samples + checkpoints + gaps
  ↓ autenticação da Conta Google do proprietário
Drive privado da conta: raw/exports/backups
Sheets privado da conta: DAILY_METRICS + SYNC_LOG
  ↓ OAuth da mesma conta
PWA no GitHub Pages: lê somente o workspace autorizado
```

## O que já está implementado

1. O PWA bloqueia o dashboard antes da autenticação.
2. O login usa Google Identity Services e pede `drive.file` + `spreadsheets`.
3. O `sub` imutável da Conta Google identifica a conta; o email não é usado como chave.
4. Na primeira autorização, o site cria uma pasta `WHOOP MG Lab`, uma planilha privada e abas `CONFIG`, `DAILY_METRICS`, `SYNC_LOG` e `RAW_INDEX`.
5. O PWA lê somente a planilha encontrada pelo `appProperties.whoopAccountId` da conta autenticada.
6. Logout revoga o token Google quando possível, limpa a sessão e desmonta o dashboard.

## O que depende da próxima etapa

- o collector ainda precisa validar Bluetooth, pareamento e protocolo da WHOOP 5.0 MG;
- o histórico real só será afirmado após captura no hardware;
- o collector precisa de um fluxo OAuth local para enviar agregados/exports ao Drive da mesma conta;
- o `VITE_GOOGLE_CLIENT_ID` precisa ser criado no Google Cloud Console e configurado no build Pages.

Nenhum valor demo é misturado com dados de conta. Sem linha em `DAILY_METRICS`, o site mostra `No data yet`, não zeros ou scores inventados.

