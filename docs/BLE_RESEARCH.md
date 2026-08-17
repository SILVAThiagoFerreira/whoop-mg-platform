# BLE Research

## Regra de evidência

Nenhum UUID, pacote, métrica ou comando é validado para WHOOP MG apenas por aparecer em código público. Promoção para `VALIDATED` exige captura RAW, dispositivo identificado, teste reproduzível e documentação do risco.

## Evidências locais

`../NoopApp-noop-7898090/Tools/linux-capture/` contém famílias de pesquisa `whoop4` e `whoop5`, reassemblagem, CRC e decodificação. Os UUIDs abaixo são apenas pistas copiadas dessa fonte local:

| Família | Serviço | Estado |
|---|---|---|
| WHOOP 4 | `61080001-8d6d-82b8-614a-1c8cb0f8dcc6` | RESEARCH_ONLY |
| WHOOP 5 | `fd4b0001-cce1-4033-93ce-002d5875f58a` | RESEARCH_ONLY |
| Heart Rate padrão | `00002a37-0000-1000-8000-00805f9b34fb` | padrão BLE, não prova WHOOP |

O NOOP contém comandos de offload e escrita de relógio. Eles não são usados pelo agente Windows P0. Não executar `SET_CLOCK`, histórico, calibração ou firmware.

## Próximo protocolo experimental

1. Acordar e aproximar a WHOOP.
2. Executar scan e salvar apenas anúncios.
3. Confirmar nome, endereço, RSSI e UUIDs anunciados.
4. Comparar com as pistas sem assumir família.
5. Se necessário, fazer descoberta GATT read-only em dispositivo identificado.
6. Só depois desenhar captura; qualquer escrita exige decisão separada e teste reversível.
