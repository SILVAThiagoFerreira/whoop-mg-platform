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

## Workspace por conta

O PWA agora usa a Conta Google autenticada como identidade. Ele pesquisa arquivos privados criados pelo próprio app usando `appProperties.whoopAccountId = <Google sub>`. Cada conta recebe uma pasta e uma planilha próprias; o PWA não consulta o `Whoop_database` compartilhado legado automaticamente. Isso evita que uma planilha compartilhada se torne um banco multiusuário sem isolamento.

O client ID OAuth é configuração pública do frontend. O access token é mantido somente em memória, expira rapidamente e precisa ser renovado por gesto do usuário. Refresh tokens não são armazenados no Pages.
