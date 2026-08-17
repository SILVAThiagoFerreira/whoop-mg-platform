# Integração com NOOP

O NOOP foi mantido como a fronteira local de coleta, armazenamento e cálculo.
Ele já possui os componentes nativos de BLE, SQLite e analytics; o dashboard
web não copia o banco, não abre a pasta do NOOP e não transforma o Pages em
coletor Bluetooth.

## Fronteiras

- **NOOP local:** pareamento, offload, SQLite, sinais e métricas derivadas.
- **Dashboard Pages:** identidade, apresentação e estados de sincronização.
- **Adaptador privado:** recebe somente a identidade validada e devolve um
  snapshot agregado read-only quando `VITE_WHOOP_API_URL` estiver configurado.

O diretório de referência é `NoopApp-noop-7898090`, ao lado do projeto web.
As cores, os cartões, os anéis e a navegação do dashboard foram alinhados ao
design system do NOOP, que documenta a linguagem visual compatível com WHOOP.

O NOOP permanece experimental para WHOOP 5.0/MG. A interface deve mostrar
`UNKNOWN`, `ESTIMATED` ou `EXPERIMENTAL` quando a origem não for medida e nunca
prometer equivalência ao score proprietário da WHOOP.
