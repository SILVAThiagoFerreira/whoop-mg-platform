# Estratégia de sincronização

O fluxo incremental usa `last_successful_sync`, `last_packet_timestamp`, `last_sample_timestamp`, `last_history_cursor`, `device_clock` e `host_clock`. A janela é planejada a partir do último sample/checkpoint e termina no host clock atual.

Fases: conectar → identificar → bateria → checkpoint → solicitar histórico → preservar raw → validar CRC → decodificar conhecido → normalizar UTC → deduplicar → persistir → agregar → Sheets/Drive → log → desconectar.

Sem protocolo validado, o comando registra uma sessão `BLOCKED`; não simula sucesso nem apaga lacunas.
