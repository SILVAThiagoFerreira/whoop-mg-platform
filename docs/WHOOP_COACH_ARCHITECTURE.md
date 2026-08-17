# Whoop Coach Architecture

O Whoop Coach é a camada de conversa e interpretação do sistema. Ele não é o
modelo fisiológico inteiro.

Fluxo:

```text
SQLite + Body Model + memória
          ↓
   contexto verificável
          ↓
      Whoop Coach
          ↓
 resposta com evidências
```

O modelo local consulta ferramentas explicitamente permitidas. Não recebe o
banco inteiro, não acessa o sistema operacional sem autorização e não deve
inventar métricas, causalidade ou diagnóstico.

Cada conclusão relevante deve carregar `claim`, `type`, `sample_size`, `method`,
`confidence`, `evidence` e `limitations`.
