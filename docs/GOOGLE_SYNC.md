# Google Sync

Google Drive/Sheets permanece backup/export auxiliar. O commit local acontece antes de qualquer sincronização. O navegador não acessa pastas ou planilhas diretamente; o Apps Script server-side valida o usuário e expõe somente snapshots mínimos. O banco local continua funcional sem Google.

## Estado implementado

O Local Agent possui três operações:

```powershell
python apps/local-agent/whoop-local.py google-pull
python apps/local-agent/whoop-local.py google-push
python apps/local-agent/whoop-local.py google-sync
```

`google-pull` lê `DAILY_METRICS` e `SYNC_LOG` usando o token configurado somente no processo local, converte as linhas em observações e aplica ingestão idempotente. `google-push` envia para `DAILY_METRICS` apenas linhas locais que ainda não existem. `google-sync` executa pull antes de push.

Configure no Alienware, nunca no Pages:

```powershell
$env:GOOGLE_ACCESS_TOKEN = "token temporário com escopo de Sheets"
$env:GOOGLE_SPREADSHEET_ID = "id da planilha privada"
```

Sem esses valores a operação retorna `BLOCKED`; nenhum token é gravado pelo agente. Para uma sincronização automática semelhante ao OneDrive, o próximo passo é executar `scripts/sync.ps1` pelo Task Scheduler do Windows em intervalo definido, além de substituir o token temporário por um fluxo OAuth local com refresh token protegido.
