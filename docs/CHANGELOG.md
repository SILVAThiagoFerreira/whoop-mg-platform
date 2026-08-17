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
# 2026-08-17

- Removidas do browser as permissões e chamadas diretas a Google Drive/Sheets.
- Removido o link para a planilha da conta e qualquer exposição de IDs de armazenamento.
- Adicionado adaptador Apps Script server-side read-only, validado por `aud`/`sub` do token Google.
- Dashboard web redesenhado com a linguagem visual do WHOOP/NOOP: score rings, cartões por domínio, navegação inferior e estados locais explícitos.
- Auditoria do Alienware documentada: Windows 11, RTX 3060 Laptop 6 GB, 63.80 GB RAM, Bluetooth Intel, Ollama não iniciado.
- Criado o Local Agent P0 com SQLite aditivo, RAW preservado, ingestão idempotente, quality issues, cursores e baselines pessoais.
- Preparado conector WHOOP API v2 OAuth local e BLE discovery read-only; `connect`/`capture` continuam bloqueados sem validação da WHOOP MG.
- Testes Python, lint, typecheck, Vitest, build e format check executados com sucesso.
