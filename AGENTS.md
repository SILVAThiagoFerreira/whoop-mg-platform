# Agentes do WHOOP MG Lab

## Regras locais

- Nunca versionar dados pessoais, secrets, tokens, cookies, ECG, PPG, R-R ou bancos.
- Diferenciar sempre `RAW`, `MEASURED`, `DERIVED`, `ESTIMATED`, `MOCK` e `UNKNOWN`.
- Não alegar conexão, histórico ou equivalência a métricas WHOOP sem evidência no hardware e testes reproduzíveis.
- Preferir mudanças pequenas e verificáveis; atualizar `docs/STATUS.md` e `docs/CHANGELOG.md` em mudanças relevantes.
- O dashboard público deve permanecer sem dados pessoais; autenticação privada será uma etapa separada.

## Comandos

```powershell
npm run lint; npm run typecheck; npm run test; npm run build
python apps/collector/whoop.py doctor
```
