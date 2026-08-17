# Operating model

## Estado real em 2026-08-17

O computador é a fonte de verdade. O Pages é uma interface autenticada e o
Google é uma cópia auxiliar. A presença de um botão `SYNC` não significa que a
pulseira foi descarregada: o offload BLE da WHOOP MG ainda está experimental e
não foi implementado neste repositório.

Hoje o fluxo verificável é:

```text
WHOOP BLE scan (somente descoberta)
WHOOP API / arquivo importado
              ↓
        Local Agent
              ↓
       RAW + SQLite no PC
              ↓
      baselines / analytics
              ↓
        Whoop Coach + desktop
```

Quando a coleta BLE for validada, o fluxo alvo será:

```text
pulseira → sessão read-only → RAW imutável → validação → SQLite
         → Body Model → relatório/snapshot → Google auxiliar → Pages
```

O envio para Google deve acontecer depois da gravação local. Uma falha de
internet nunca pode apagar ou bloquear o dado local. O Pages não recebe os
arquivos da pulseira e não tem permissão direta para Drive ou Sheets.

Para ativar a cópia automática após cada ingestão, configure no agente local
`WHOOP_AUTO_GOOGLE_SYNC=1`, `GOOGLE_ACCESS_TOKEN` e
`GOOGLE_SPREADSHEET_ID`. O padrão é `0` para evitar qualquer envio externo
acidental. A coleta BLE ainda precisa existir antes de esse gatilho representar
uma sincronização da pulseira.

## Desktop

O desktop possui uma console de performance com os mesmos grupos do produto
online: Today, Recovery, Sleep, Strain e Trends, além de Conversar, Dados &
Sync e Modelo local. Os painéis leem `GET /dashboard` do agente local. Sem
dados, exibem `—` e o motivo; nenhum score fisiológico é fabricado.

O botão de sincronização do desktop executa somente a cópia auxiliar Google e
retorna `BLOCKED` quando `GOOGLE_ACCESS_TOKEN` ou `GOOGLE_SPREADSHEET_ID` não
estão configurados. Ele não representa o offload da pulseira.

## Respostas curtas

O Coach usa temperatura baixa, histórico reduzido e limite de saída no agente
local. Perguntas simples devem receber até três frases. Uma resposta longa só
é apropriada quando o usuário pede análise, evidência ou relatório.

## Uso de alto rendimento

O sistema ainda não está validado para orientar atletas olímpicos ou decisões
de competição. Antes disso, são obrigatórios: perfis e permissões por atleta,
proveniência de cada medida, controle de qualidade, validação temporal,
versionamento dos modelos, revisão por profissional qualificado e trilha de
auditoria. O projeto pode ser a plataforma de pesquisa e suporte, mas não deve
ser tratado como dispositivo médico nem como substituto de equipe clínica.
