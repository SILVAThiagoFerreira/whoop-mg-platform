# Google Drive e Sheets

## Estado atual

O armazenamento Google legado não faz parte do fluxo do produto. IDs, links e
nomes de arquivos não são documentados nem enviados ao navegador. Se os
recursos antigos ainda existirem, devem ser revisados no Drive do proprietário
e descompartilhados ou removidos manualmente.

O Pages usa a Conta Google apenas como identidade. Não solicita escopos
`drive.file`, `spreadsheets` ou `drive`, não pesquisa arquivos e não oferece
link para pasta/planilha.

## Adaptador privado opcional

Quando `VITE_WHOOP_API_URL` estiver configurado, o Apps Script executa como o
proprietário, valida o token curto em `oauth2.googleapis.com/tokeninfo`, confere
o client ID (`aud`) e usa somente o `sub` validado para selecionar o namespace.
O endpoint aceita apenas `POST { action: "snapshot", accessToken }` e devolve
agregados; nunca IDs, URLs, tokens, raw BLE ou operações de escrita.

Sem essa variável, o app permanece em modo local e não toca em nenhum
recurso Google.

## Operação

1. Configure `WHOOP_OAUTH_CLIENT_ID` e `WHOOP_ROOT_FOLDER_ID` em Script Properties.
2. Publique o Apps Script como Web App executando como o proprietário.
3. Faça um teste com uma conta autorizada e um snapshot vazio.
4. Cadastre somente a URL do Web App como variável `WHOOP_API_URL` no GitHub Actions.
5. Nunca adicione uma rota de listagem, download, compartilhamento ou escrita ao
   endpoint público.
