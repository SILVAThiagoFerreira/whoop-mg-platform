# Google Apps Script

Este módulo é o adaptador privado do dashboard. Ele deve ser implantado como Web App executando como o proprietário, com `WHOOP_OAUTH_CLIENT_ID` e `WHOOP_ROOT_FOLDER_ID` em **Script Properties**.

O endpoint pode ser acessível pela web (`ANYONE_ANONYMOUS`) somente porque cada `POST` valida o access token curto do Google em `oauth2.googleapis.com/tokeninfo`, confere o `aud` contra o client ID e deriva o namespace exclusivamente do `sub` verificado. O cliente nunca recebe IDs, URLs ou permissões Drive/Sheets.

Rotas permitidas: `POST { action: "snapshot", accessToken }` e a ação autenticada `POST { action: "ingest", accessToken, records }` para o coletor nativo do iPhone. Qualquer outra ação é rejeitada. `ingest` aceita no máximo 250 registros por lote, valida métrica/proveniência/confiança e deduplica por `eventId`. Os arquivos ficam na unidade do proprietário e o usuário final não é compartilhado como colaborador.

Não colocar tokens, client secrets, dados pessoais ou IDs de contas no Pages. Após publicar o Web App, cadastrar a URL como variável pública `WHOOP_API_URL` no GitHub Actions; a URL sozinha não autoriza leitura, pois o token Google é validado no Apps Script.
