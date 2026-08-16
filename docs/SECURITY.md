# Segurança

- O repositório Pages contém código e dados demo, nunca saúde pessoal.
- `.gitignore` bloqueia SQLite, CSV, Parquet, raw, exports, secrets e credenciais.
- Google Apps Script deve executar como o proprietário e restringir acesso; endpoint anônimo é proibido para dados pessoais.
- O collector local é a fronteira de acesso ao Bluetooth e ao banco.
- Backups no Drive devem ser compactados, identificados e acessíveis somente ao proprietário.
- Antes de cada push: `git diff --check`, busca por `token`, `secret`, `client_secret`, emails e arquivos ignorados.
