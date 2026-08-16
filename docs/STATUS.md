# STATUS

## Working

Dashboard PWA account-first, OAuth Google/Drive/Sheets por conta, esquema SQLite, collector seguro, Apps Script scaffold, pesquisa e documentação.

## Partial

GitHub Pages foi publicado e verificado no navegador em `https://silvathiagoferreira.github.io/whoop-mg-platform/`; o workflow `.github/workflows/deploy-pages.yml` está ativo e o último run passou em lint, typecheck, testes, build e deploy. Login/isolamento estão implementados, mas exigem `VITE_GOOGLE_CLIENT_ID`. Drive/Sheets estão acessíveis no navegador gerenciado, sem teste de escrita autenticada. Protocolos BLE ainda não foram validados no hardware.

## Experimental

WHOOP 5.0/MG BLE, histórico offload, ECG/MG, métricas equivalentes a Recovery/Sleep/Strain/Stress, MCP.

## Blocked

Coleta real e upload privado: dependem do pareamento Bluetooth e da sessão Google autenticada.

## Last successful sync

Nenhuma. O collector registra `BLOCKED` sem inventar sincronização.

## Data gaps

Nenhuma lacuna real calculada; não há dados locais.

## Current milestone

Milestone 1 — fundação account-first executável; início do Milestone 2.

## Next actions

Concluir o OAuth Client ID Google, configurar a variável `GOOGLE_CLIENT_ID`, validar a criação da pasta/planilha privada e testar o hardware WHOOP.
