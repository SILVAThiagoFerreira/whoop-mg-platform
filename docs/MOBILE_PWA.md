# Mobile PWA

O PWA é uma interface mobile-first. Ele não coleta BLE ou HealthKit diretamente — o Safari no iPhone não oferece essa capacidade ao site. O coletor nativo lê a pulseira/Apple Health e envia observações autenticadas ao Apps Script. O Pages recebe somente status, contexto e histórico da planilha privada do Drive, com polling de 15 segundos.

O contrato nativo está em `apps/ios-collector/WhoopCloudSync.swift`:

```text
pulseira → CoreBluetooth/HealthKit no iPhone → WhoopCloudSync
  → Apps Script autenticado → DAILY_METRICS/SYNC_LOG no Drive
  → PWA Pages (snapshot + histórico, a cada 15 s)
```

Não há promessa de atualização segundo a segundo no Google Sheets; esse nível de telemetria exige um canal realtime separado.
