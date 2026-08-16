# STATUS

## Working

Dashboard PWA estático, esquema SQLite, collector seguro, Apps Script scaffold, pesquisa e documentação.

## Partial

GitHub Pages foi publicado e verificado no navegador em `https://silvathiagoferreira.github.io/whoop-mg-platform/`; a branch `gh-pages` está `built`. O workflow `.github/workflows/deploy-pages.yml` está no checkout local, mas o primeiro push dele aguarda escopo OAuth `workflow`. Drive/Sheets estão acessíveis no navegador gerenciado, sem teste de escrita autenticada. Protocolos BLE ainda não foram validados no hardware.

## Experimental

WHOOP 5.0/MG BLE, histórico offload, ECG/MG, métricas equivalentes a Recovery/Sleep/Strain/Stress, MCP.

## Blocked

Coleta real e upload privado: dependem do pareamento Bluetooth e da sessão Google autenticada.

## Last successful sync

Nenhuma. O collector registra `BLOCKED` sem inventar sincronização.

## Data gaps

Nenhuma lacuna real calculada; não há dados locais.

## Current milestone

Milestone 1 — fundação executável.

## Next actions

Manter o artefato Pages atualizado, autorizar o escopo `workflow`, sincronizar a branch principal completa e validar o hardware WHOOP.
