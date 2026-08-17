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

## Fonte de verdade e fluxo seguro

Este diretório é o repositório Git canônico dentro da raiz oficial `Whoop`. O diretório `NoopApp-noop-7898090` na raiz é uma referência externa preservada; não é copiado para o bundle web nem tratado como prova de compatibilidade com WHOOP MG.

O agente local fica em `apps/local-agent/`. Ele é local-first, usa SQLite, preserva RAW e só habilita BLEAK quando a dependência estiver instalada. `connect` e `capture` permanecem explicitamente bloqueados até existir uma validação reproduzível do dispositivo-alvo.

```text
WHOOP / arquivo / API → RAW imutável → observations + quality
→ baselines / modelos / memória → API privada / PWA
→ Google como backup/export auxiliar
```

Nunca colocar banco, tokens WHOOP, refresh tokens ou dados fisiológicos no GitHub Pages.
