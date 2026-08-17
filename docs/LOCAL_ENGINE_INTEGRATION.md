# Integração do motor local

O motor local é a fronteira de coleta, armazenamento e cálculo fisiológico do projeto.

Ele mantém coleta autorizada, SQLite, sinais e métricas derivadas fora do navegador. A interface web recebe somente snapshots mínimos por uma API privada autenticada quando essa integração estiver configurada.

O diretório externo usado como referência de pesquisa permanece separado do projeto e não é copiado para o bundle web.

O suporte BLE da WHOOP 5.0/MG continua experimental até ser validado no hardware real. Nenhuma operação de firmware, calibração, relógio ou offload histórico é executada sem evidência e testes read-only.
