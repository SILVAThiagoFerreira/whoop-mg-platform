# Segurança

## Decisão vigente — 2026-08-17

O navegador não tem mais escopo `drive.file`, `spreadsheets` ou qualquer chamada direta a Drive/Sheets. A tela também não expõe pasta, planilha, ID ou link do Google.

Quando `VITE_WHOOP_API_URL` estiver vazio, o produto opera em modo local e falha fechado: não há fallback para Google Drive. Quando configurado, somente o Apps Script server-side acessa os arquivos do proprietário; ele valida `accessToken`, `aud` e `sub`, ignora IDs enviados pelo cliente e oferece apenas leitura de snapshot.

- O repositório Pages contém código e dados demo, nunca saúde pessoal.
- `.gitignore` bloqueia SQLite, CSV, Parquet, raw, exports, secrets e credenciais.
- Google Apps Script deve executar como o proprietário. A publicação web só pode aceitar chamadas que passem pela validação de token; não adicionar rotas anônimas ou de escrita.
- O collector local é a fronteira de acesso ao Bluetooth e ao banco.
- Backups no Drive devem ser compactados, identificados e acessíveis somente ao proprietário.
- Antes de cada push: `git diff --check`, busca por `token`, `secret`, `client_secret`, emails e arquivos ignorados.
