# STATUS

## Working

Dashboard PWA account-first, identidade Google sem escopo Drive/Sheets, shell
visual inspirado na experiência WHOOP/NOOP, esquema SQLite, collector seguro,
adaptador Apps Script read-only, agente local P0, ingestão RAW idempotente,
baselines pessoais e documentação de segurança.

## Verified this run

- Ambiente: Alienware m15 R6, 63.80 GB RAM, RTX 3060 Laptop 6 GB, Bluetooth Intel.
- `python -m unittest discover -s tests -v`: PASS (2 testes).
- `npm run lint`, `typecheck`, `test`, `build` e `format:check`: PASS.
- `python apps/local-agent/whoop-local.py doctor`: PASS para fundação local.
- `scan --timeout 8`: PASS read-only; nenhum dispositivo foi identificado como WHOOP MG.

## Partial

GitHub Pages foi publicado e verificado no navegador em `https://silvathiagoferreira.github.io/whoop-mg-platform/`; o workflow `.github/workflows/deploy-pages.yml` está ativo. O login exige `VITE_GOOGLE_CLIENT_ID`; dados sincronizados exigem também `VITE_WHOOP_API_URL`. O browser não acessa Drive/Sheets diretamente. Protocolos BLE ainda não foram validados no hardware.

## Experimental

WHOOP 5.0/MG BLE, histórico offload, ECG/MG, métricas equivalentes a Recovery/Sleep/Strain/Stress, MCP.

## Blocked

Coleta real e upload privado: dependem do pareamento Bluetooth, da validação
NOOP/hardware e da implantação do adaptador privado.

## Last successful sync

Nenhuma. O collector registra `BLOCKED` sem inventar sincronização.

## Data gaps

Nenhuma lacuna real calculada; não há dados locais.

## Current milestone

Milestone 1 — fundação local-first executável; início da validação BLE/API.

## Next actions

Instalar/configurar credenciais OAuth WHOOP apenas no Alienware, repetir scan com
a WHOOP MG acordada, e somente então projetar conexão GATT read-only. Publicação
do Apps Script e GitHub Pages permanece separada do cérebro local. O usuário não
deve ser adicionado como colaborador nos arquivos do proprietário.
