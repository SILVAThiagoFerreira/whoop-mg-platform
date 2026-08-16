# WHOOP MG Lab — skill local

## Fluxo

1. `python apps/collector/whoop.py doctor`
2. `python apps/collector/whoop.py status`
3. revisar `docs/STATUS.md` e `docs/PENDING_ACTIONS.md`
4. usar `whoop sync` somente com hardware/protocolo validado
5. armazenar raw antes de decodificar e registrar gaps/checkpoints
6. publicar apenas frontend sem dados pessoais

## Verificações

`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; validar Drive/Sheets separadamente e registrar qualquer pendência externa.
