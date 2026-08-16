# Changelog

## 2026-08-16 — 0.1.0

- Implementado fluxo account-first com Google Identity Services, workspace privado por conta e dashboard sem dados antes da autenticação.
- Separado o pipeline WHOOP: collector local/BLE grava SQLite; PWA autenticado lê somente o workspace Google da conta atual.
- Adicionados escopo OAuth mínimo `drive.file`, `account_id` opaco com namespace do client ID e documentação de isolamento, autenticação e UX.
- Criada fundação do WHOOP MG Lab.
- Adicionado dashboard mobile-first/PWA com dados demo identificados.
- Adicionados schema SQLite, collector Python e estratégia incremental.
- Adicionados Apps Script seguro por padrão, CI Pages e documentação.
- Registrada pesquisa inicial de protocolo, recursos do app e auditoria arquitetural.
- Publicada a primeira build estática em GitHub Pages e verificada por navegador.
