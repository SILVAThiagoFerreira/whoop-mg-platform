# Google Drive e Sheets

## Recursos validados por inspeção visual

- Drive folder ID: `1PoGKDDcluoAZoqFjSRdEdl0kqEiBc_8L`.
- Nome exibido: `WHOOP LAB`.
- Arquivo encontrado: `Whoop_database`, tipo Google Planilhas, compartilhado.
- Spreadsheet ID: `1-Tt053X7FMFPJeOgBM-kSYev7uz5u2_RMGHpmlMqwVg`.
- Aba visível: `Página1`; nenhum dado/cabeçalho foi identificado na inspeção pública.

O acesso ocorreu pelo navegador gerenciado, sem login do perfil pessoal. Isso comprova apenas que os links são acessíveis e que o recurso existe; não comprova autorização de escrita autenticada.

## Plano não destrutivo

1. criar/usar uma aba `SYSTEM_TEST` somente após autenticação do proprietário;
2. escrever um marcador reversível de teste;
3. ler de volta e registrar timestamp/resultado;
4. só então habilitar agregados em abas como `DAILY_METRICS`, `SLEEP`, `RECOVERY` e `SYNC_LOG`;
5. nunca enviar raw de alta frequência para Sheets.

`apps/apps-script` mantém escrita desabilitada por padrão e usa Drive para listar arquivos/backups. Tokens não entram no frontend nem no Git.
