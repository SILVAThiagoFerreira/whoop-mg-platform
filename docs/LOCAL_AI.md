# IA local e propriedade dos artefatos

O Ollama é o runtime. Ele carrega pesos de um modelo-base local e expõe uma
API em `http://localhost:11434`. O Whoop Coach futuro chamará essa API depois de
construir um contexto fisiológico pequeno e verificável.

O LLM não é o Body Model. O aprendizado do corpo ocorre no banco, nas séries
temporais, nas baselines, nos modelos estatísticos e no registro de previsões.
O LLM interpreta resultados, consulta ferramentas e explica evidências.

## Modelo operacional

`whoop-coach:0.1` (Qwen3.5 4B) permanece operacional porque é a opção rápida
compatível com a RTX 3060 de 6 GB. `whoop-coach:0.2` (Qwen3.5 9B) foi criado
como candidato de maior capacidade, mas ainda não foi promovido.

Smoke tests locais de 2026-08-17 mediram aproximadamente 15,89 s para uma
resposta curta no 4B e 35,55 s no 9B, após carregamento. Isso não é benchmark
de qualidade; a promoção exige avaliação específica de fisiologia, alucinação,
precisão de evidências, latência e uso de VRAM/RAM.

## Armazenamento

Por padrão, o Ollama mantém os pesos em `%USERPROFILE%\.ollama\models`.
No computador atual isso significa `C:\Users\ferre\.ollama\models`.
O projeto mantém receitas, manifestos, avaliações e hashes em `models/`.
Não colocar pesos gigantes no GitHub nem sincronizá-los cegamente pelo OneDrive;
usar backup privado versionado por checksum.

Para criar uma cópia recuperável do modelo e da receita:

```powershell
.\scripts\backup-llm.ps1 -Destination "D:\Backups\Whoop\2026-08-17"
```

O backup inclui o armazenamento de modelos do Ollama e os manifestos/receitas
versionados do projeto. O destino deve ser um disco privado com espaço livre
suficiente; não use um repositório Git público.

## Ciclo de evolução

```text
Dados locais
  ↓
Features e Body Model
  ↓
Avaliação temporal
  ↓
Contexto e memória
  ↓
Whoop Coach local
  ↓
Feedback e prediction tracker
  ↓
Nova versão somente se melhorar
```

No início, a evolução será por contexto, ferramentas, memória e estatística.
Fine-tuning será opcional e só será considerado com histórico suficiente,
dataset controlado, validação walk-forward e backup do adaptador/treinamento.

Os modelos fisiológicos treinados pelo projeto não ficam dentro do diretório do
Ollama: ficam em `models/ml/`, com manifesto em `models/registry/`. Isso separa
os pesos do LLM dos modelos pessoais de previsão e facilita backup e migração.
