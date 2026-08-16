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
