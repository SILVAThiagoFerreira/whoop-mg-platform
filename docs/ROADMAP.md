# Roadmap

## DONE

- Repositório Git existente preservado e auditado.
- PWA privado sem acesso direto do navegador a Drive/Sheets.
- Schema SQLite inicial preservado.
- Schema canônico P0 adicionado: imports, RAW, observations, qualidade, cursores, baselines, memória, previsões e eventos.
- Auditoria real do Alienware documentada.
- Agente local criado com `doctor`, `scan`, `devices`, `inspect`, `ingest`, `baseline`, `sync` e `api-auth-url`.
- Ingestão JSON idempotente com RAW e deduplicação.
- Conector WHOOP API v2 preparado, bloqueado sem credenciais.
- BLE discovery read-only preparado, sem UUIDs tratados como validados.
- Modelo local `qwen3.5:4b` instalado no Ollama e derivação `whoop-coach:0.1` criada a partir de receita versionada.

## IN PROGRESS

- Validar a WHOOP MG física via anúncios BLE.
- Integrar `observations` à API privada e ao dashboard.
- Adicionar testes temporais e data-quality além do núcleo P0.

## BLOCKED

- Captura histórica BLE: depende de identificação e teste físico.
- OAuth WHOOP: depende de client ID, secret e consentimento.
- Integração do Whoop Coach com ferramentas reais, Body Context Builder e dados fisiológicos.
- API remota segura: requer decisão operacional entre Tailscale/VPN/Tunnel.

## NEXT

1. Instalar `bleak` no ambiente de teste e executar scan read-only.
2. Configurar OAuth oficial WHOOP somente no Alienware.
3. Ingerir fixture real anonimizada e comparar API/BLE quando houver.
4. Criar API local read-only com autenticação e ligar o PWA a ela.
5. Implementar Body Context Builder, similar days e prediction tracker.
6. Medir tool calling, latência e qualidade do modelo local com contexto fisiológico sintético.

## IDEAS

- DuckDB/Parquet para séries de alta frequência.
- Eventos externos, experimentos e feedback.
- Tailscale como primeira opção de acesso remoto.
- Voz local, novos sensores e notificações.

Só promover item para DONE após teste reproduzível e documentação da evidência.
