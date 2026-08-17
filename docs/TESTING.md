# Testing

```powershell
python -m unittest discover -s tests -v
npm run lint
npm run typecheck
npm run test
npm run build
```

Testes locais não usam dados fisiológicos reais. Fixtures são sintéticas e marcadas como `MOCK` quando aplicável. Testes BLE reais só registram anúncios e precisam de hardware identificado.
