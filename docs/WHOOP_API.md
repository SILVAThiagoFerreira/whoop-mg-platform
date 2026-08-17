# WHOOP API Connector

O conector usa a API oficial WHOOP v2 quando credenciais forem configuradas. A documentação oficial informa OAuth 2.0, refresh token com o escopo `offline`, token endpoint `https://api.prod.whoop.com/oauth/oauth2/token` e endpoints v2 de cycles, recovery, sleep e workout. Fontes: [API reference](https://developer.whoop.com/api/) e [OAuth](https://developer.whoop.com/docs/developing/oauth/).

## Configuração local

Nunca colocar valores reais no Git:

```powershell
$env:WHOOP_CLIENT_ID = "..."
$env:WHOOP_CLIENT_SECRET = "..."
$env:WHOOP_REFRESH_TOKEN = "..."
```

Como alternativa temporária, `WHOOP_ACCESS_TOKEN` permite uma sincronização sem refresh automático.

## Fluxo

```text
OAuth → refresh token no Alienware → GET v2 paginado
→ raw_documents + imports → observations deduplicadas
```

O conector limita páginas a 25 registros, respeita `next_token`, espera entre páginas e não envia dados para Google. Sem credenciais, a sincronização é bloqueada.

O calendário fisiológico da WHOOP não é convertido silenciosamente em dia civil; campos ausentes são omitidos e zeros não são inventados.
