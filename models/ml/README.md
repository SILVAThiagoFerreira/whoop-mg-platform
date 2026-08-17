# Modelos fisiológicos pessoais

Esta pasta é reservada para artefatos aprendidos a partir dos dados do Thiago,
como modelos de baseline, anomalia, previsão e readiness.

Estrutura planejada:

```text
models/ml/
  features/       # esquemas e transformações reproduzíveis
  candidates/     # modelos ainda não promovidos
  promoted/       # modelo atualmente usado
  adapters/       # artefatos auxiliares, quando existirem
```

No momento não há pesos fisiológicos treinados, pois o banco ainda não contém
dados reais. O primeiro modelo será criado somente após dados suficientes e
validação temporal. Cada artefato precisa apontar para um manifesto em
`models/registry/`.
