# Modelo local de linguagem

O projeto não versiona pesos de modelos no GitHub. A receita versionada fica em
`Modelfile` e os pesos são mantidos pelo Ollama no armazenamento local do
computador.

## Modelo inicial

O primeiro candidato é `qwen3.5:4b`, escolhido para a RTX 3060 Laptop de 6 GB
e 63,8 GB de RAM. Ele é um modelo-base local; `whoop-coach:0.1` é uma
derivação local com instruções e parâmetros próprios do projeto.

```powershell
ollama pull qwen3.5:4b
ollama create whoop-coach:0.1 -f models/llm/Modelfile
ollama run whoop-coach:0.1
```

Não usar tags terminadas em `:cloud` para dados fisiológicos privados.

## O que é um ativo do projeto

- `Modelfile`: receita reproduzível e versionada.
- `models/registry/`: identidade, base, hash, licença, avaliações e motivo de promoção.
- memória fisiológica e datasets: ficam no armazenamento local privado.
- pesos: ficam no diretório de modelos do Ollama e devem ser incluídos em backup privado, nunca no GitHub.

A licença do modelo-base continua valendo. O projeto é proprietário dos seus
prompts, configurações, datasets pessoais, avaliações, adaptadores próprios e
artefatos estatísticos, mas não pode reivindicar propriedade irrestrita dos
pesos de terceiros.

## Como melhorar

Primeiro melhorar o sistema sem fine-tuning:

1. Body Model calcula baselines e features.
2. Memória recupera padrões confirmados.
3. Ferramentas entregam consultas precisas ao Whoop Coach.
4. O LLM interpreta o contexto reduzido.
5. Respostas e previsões são avaliadas.

Somente depois de existir histórico suficiente avaliar LoRA/fine-tuning. Cada
versão precisa de dataset, período de validação temporal, métricas, limitações,
checksum e comparação com a versão anterior.
