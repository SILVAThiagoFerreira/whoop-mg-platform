# Fluxo de dados e aprendizado do Whoop Coach

## Quando a WHOOP for reconhecida

O Pages não deve ser a origem física da coleta Bluetooth. Um navegador hospedado
no GitHub Pages não consegue manter um agente BLE confiável no Alienware quando
a janela é fechada. O desenho seguro é:

```text
WHOOP MG
  ↓ Bluetooth BLE (agente local, somente leitura)
Alienware / Whoop Coach Desktop
  ↓
RAW imutável + SQLite local
  ↓
validação e normalização
  ↓
features, baselines e Body Model
  ↓
Whoop Coach local (Ollama)
  ↓
Desktop / Pages autenticado
```

O site pode mostrar o estado da pulseira e iniciar uma solicitação ao agente
local, mas a captura histórica somente poderá ser liberada depois que o
protocolo BLE da WHOOP MG for confirmado experimentalmente. O sistema atual
faz descoberta real em modo read-only e não envia comandos de escrita.

Também existe o conector da API oficial WHOOP. Nesse caminho, o agente usa
OAuth, paginação e cursores, salva a resposta original e depois faz a mesma
projeção local. BLE e API podem coexistir sem duplicar registros.

## Como os dados chegam ao modelo

O LLM não lê o banco inteiro e não é atualizado diretamente a cada medição.

1. A coleta grava o payload original em `data/raw/` e em `raw_documents`.
2. O pipeline valida timestamps, unidades, duplicatas, gaps e qualidade.
3. A projeção canônica entra em `observations` e `sensor_samples`.
4. O Body Model calcula baselines pessoais, tendências e features.
5. O contexto reduzido é montado com métricas atuais, histórico relevante,
   anomalias, previsões e qualidade dos dados.
6. O Whoop Coach recebe somente esse contexto e explica o resultado.

Assim, quando o usuário pergunta “como estou?”, a resposta usa dados pessoais
do SQLite local, e não conhecimento fisiológico genérico isolado.

## O que significa treinar

Existem dois tipos de aprendizado:

### Aprendizado fisiológico — primeiro

É o que começa assim que houver dados suficientes:

```text
observações → baselines → features → associação temporal → previsão
```

Modelos interpretáveis, como regressão, detecção de anomalias e previsões
temporais, serão treinados com validação temporal. Eles serão guardados em
`models/ml/` e registrados em `models/registry/`. Um candidato só substitui o
modelo anterior quando melhorar em backtest e walk-forward validation.

### Treinamento do LLM — depois e opcional

O `whoop-coach:0.1` atual é uma receita local do Qwen3.5 com instruções do
projeto; ele ainda não contém seu histórico fisiológico nos pesos. Isso é
intencional: para o início, contexto estruturado, memória, ferramentas e
Body Model são mais auditáveis que fine-tuning.

Quando houver histórico, feedback e dataset controlado, pode-se avaliar LoRA ou
outro adaptador. O adaptador será versionado como ativo próprio em
`models/llm/adapters/`, com manifesto, checksum, dataset, licença e métricas.

## Onde ficam os ativos

| Ativo | Local |
|---|---|
| Banco principal | `data/whoop.db` |
| Dados originais | `data/raw/` |
| Receita do LLM | `models/llm/Modelfile` |
| Manifestos | `models/registry/` |
| Modelos fisiológicos | `models/ml/` |
| Adaptadores futuros do LLM | `models/llm/adapters/` |
| Pesos Ollama | `%USERPROFILE%\.ollama\models` |

Os pesos do modelo-base continuam sujeitos à licença do fornecedor. O projeto
controla suas receitas, configurações, dados pessoais, datasets, avaliações,
features, modelos fisiológicos e adaptadores próprios.

## Backup

```powershell
.\scripts\backup-llm.ps1 -Destination "D:\Backups\Whoop\modelo-2026-08-17"
```

Esse backup copia os pesos gerenciados pelo Ollama e os ativos versionados do
projeto. Ele deve ser feito para um disco privado, fora do GitHub e fora de uma
pasta pública do OneDrive.
