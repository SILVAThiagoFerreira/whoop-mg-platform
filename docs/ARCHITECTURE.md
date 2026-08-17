# Arquitetura

## Decisão

Local-first, com o collector e o SQLite como fonte de verdade. O dashboard Pages é uma interface estática; Drive e Sheets são destinos de backup/resumo, não o banco principal.

```text
WHOOP 5.0 MG -> Collector/Bleak -> raw_packets + sensor_samples (SQLite)
                                      |              |
                                      v              v
                              Drive backups     Aggregation/analytics
                                                     |
                                                     v
                                              Sheets summaries
                                                     |
                                                     v
                                             PWA static dashboard
```

O OpenClaw/Codex orquestra tarefas e o MCP roda no host local. O Pages não acessa Bluetooth, arquivos locais ou dados privados sem uma camada autenticada explícita.

## Proveniência

Cada amostra possui `source`, `source_type`, `quality`, `confidence`, `is_derived`, `algorithm_name` e `algorithm_version`. Pacotes desconhecidos são preservados como hex; decodificação não destrói o raw.

## Custo

O caminho básico pode operar com R$ 0/mês: software local, GitHub Pages/Actions, Drive/Sheets e Apps Script dentro das cotas gratuitas. Apple Developer Program não é necessário para “Adicionar à Tela de Início”; publicação nativa na App Store seria outra decisão.

## Personal Physiology Operating System

O WHOOP MG Lab evolui para um sistema local-first cujo cérebro é o Alienware. O PWA é uma interface; Google é sincronização auxiliar; o banco local é a fonte principal.

```text
WHOOP BLE / WHOOP API / arquivo / entrada manual
                    ↓
             Local Agent
        scan · ingest · validate · raw
                    ↓
       SQLite observations + quality
                    ↓
       Analytics / Body Model / ML
                    ↓
        Memory + Jarvis Core + LLM
                    ↓
       API privada → PWA no iPhone
                    ↓
       Google backup/export opcional
```

Contratos: `raw_documents` preserva payloads; `observations` é a projeção canônica; `quality_issues` registra problemas; `sync_cursors` é separado por fonte; baselines carregam janela e algoritmo. Nenhum LLM substitui estatística ou evidência do banco.

O Pages não recebe tokens WHOOP, banco, segredos ou dados pessoais. O agente local é a única fronteira BLE/SQLite. Google só recebe exportações aprovadas depois do commit local.
