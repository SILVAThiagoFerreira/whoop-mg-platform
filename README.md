# WHOOP MG Lab

Personal Performance Intelligence para coleta, armazenamento e análise local de dados de uma WHOOP 5.0 MG.

> Plataforma não oficial de analytics pessoais. Nenhum dado de saúde pessoal é versionado neste repositório.

## Estado atual

- Dashboard web mobile-first em React + TypeScript + Vite.
- PWA estático preparado para GitHub Pages.
- `MockProvider` visível como `DEMO DATA`; nenhum valor clínico é inventado como medição.
- Esquema SQLite, checkpoints, gaps, pacotes brutos e sync engine em fundação.
- Collector Python preparado para Bleak; descoberta e histórico real ainda dependem do hardware e do protocolo confirmado.
- Integração Google modular com IDs fornecidos pelo proprietário; nenhum token é embutido no frontend.

## Desenvolvimento

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

O site local fica em `http://localhost:5173/whoop-mg-platform/`.

## Collector

```powershell
python apps/collector/whoop.py doctor
python apps/collector/whoop.py scan
python apps/collector/whoop.py sync
```

O collector nunca afirma conexão sem uma conexão Bluetooth real. Instale `bleak` somente quando for testar o adaptador: `python -m pip install bleak`.

## Privacidade

Dados brutos, bancos SQLite, exports, credenciais e tokens ficam fora do Git. A publicação Pages contém apenas o shell e dados demo. Veja `docs/SECURITY.md` e `docs/PENDING_ACTIONS.md`.

## Documentação

- `docs/ARCHITECTURE.md`: arquitetura e limites.
- `docs/DATA_MODEL.md`: modelo canônico e proveniência.
- `docs/REVERSE_ENGINEERING.md`: matriz de protocolo.
- `docs/GOOGLE_INTEGRATION.md`: Drive/Sheets e Apps Script.
- `docs/STATUS.md`: estado verificável desta execução.
- `docs/ROADMAP.md`: marcos seguintes.
