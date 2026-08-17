# Armazenamento na conta Google a partir de frontend estático

## Estado atual

O frontend não usa mais o token model para Drive/Sheets. O token de identidade fica somente em memória e serve para autenticação. A única ponte opcional é `VITE_WHOOP_API_URL`, que aponta para o adaptador Apps Script executando como proprietário. Se essa variável não existir, o app permanece em modo NOOP local.

Isso é obrigatório para o requisito de não permitir que usuários abram ou manipulem diretamente a pasta/planilha. Uma SPA não consegue esconder de seu próprio usuário um access token que tenha permissão de Drive.

## Escopo e decisão arquitetural

Este documento descreve um caminho para o dashboard estático pedir autorização no navegador e gravar dados derivados na conta Google do próprio usuário, sem backend OAuth. O fluxo recomendado para esse caso é o **Google Identity Services (GIS) token model**:

1. o frontend carrega `https://accounts.google.com/gsi/client`;
2. cria um cliente com `google.accounts.oauth2.initTokenClient({ client_id, scope, callback })`;
3. em uma ação explícita do usuário, chama `requestAccessToken()`;
4. envia o `access_token` em `Authorization: Bearer ...` para as APIs Drive/Sheets;
5. ao expirar, pede outro token em uma nova ação do usuário.

Esse modelo é apropriado para chamadas REST e CORS diretamente do browser e não entrega refresh token ao frontend. O token é de curta duração; portanto, não deve ser tratado como sessão permanente nem salvo em repositório, URL, logs ou banco. A documentação oficial recomenda o GIS em vez do guia antigo de aplicação JavaScript.

Fontes: [Use the token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [How user authorization works](https://developers.google.com/identity/oauth2/web/guides/how-user-authz-works), [OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies).

### Quando usar o code model

Se for necessário operar sem o usuário presente, guardar refresh token ou executar jobs no servidor, um frontend estático sozinho não basta. Nesse caso, usar `initCodeClient()` e um backend próprio que receba o código, valide CSRF/estado e o troque por access/refresh tokens. Nunca colocar client secret no JavaScript. Fonte: [Use the code model](https://developers.google.com/identity/oauth2/web/guides/use-code-model).

## APIs e endpoints

### Google Drive API v3

Base REST: `https://www.googleapis.com`.

- Listar arquivos/metadados: `GET https://www.googleapis.com/drive/v3/files?q=...&fields=files(id,name,mimeType,modifiedTime),nextPageToken`.
- Obter metadados: `GET https://www.googleapis.com/drive/v3/files/{fileId}`.
- Criar arquivo: `POST https://www.googleapis.com/drive/v3/files` (metadados JSON).
- Criar arquivo com conteúdo: `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` ou `media`.
- Atualizar metadados/conteúdo: `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}`.
- Excluir: `DELETE https://www.googleapis.com/drive/v3/files/{fileId}` (ação destrutiva; preferir lixeira/backup lógico no produto).

Para um backup JSON pequeno, multipart é conveniente: uma parte `application/json` com `{name, mimeType, parents}` e outra com o conteúdo. Para arquivos maiores ou conexão instável, usar upload resumable. A API aceita arquivos até 5,120 GB, mas o produto deve impor limite muito menor e validar MIME/tamanho antes do upload.

Fontes: [Drive REST v3](https://developers.google.com/drive/api/reference/rest/v3), [files.create](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create), [Upload file data](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

### Google Sheets API v4

Base REST: `https://sheets.googleapis.com/v4`.

- Ler valores: `GET /spreadsheets/{spreadsheetId}/values/{range}`.
- Escrever um intervalo: `PUT /spreadsheets/{spreadsheetId}/values/{range}?valueInputOption=RAW`.
- Escrever vários intervalos: `POST /spreadsheets/{spreadsheetId}/values:batchUpdate`.
- Acrescentar linhas: `POST /spreadsheets/{spreadsheetId}/values/{range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`.
- Alterar estrutura/formatação: `POST /spreadsheets/{spreadsheetId}:batchUpdate`.

O corpo de `values.append` é um `ValueRange`, por exemplo `{"majorDimension":"ROWS","values":[["2026-08-16","DERIVED",123]]}`. O `range` é A1 e serve para localizar a tabela; `append` coloca os dados depois da última linha da tabela. `RAW` evita que o Sheets interprete datas/fórmulas como entrada do usuário; só usar `USER_ENTERED` quando essa interpretação for intencional.

Para escrita simples, preferir `values.update`, `values.batchUpdate` ou `values.append`; usar `spreadsheets.batchUpdate` para estrutura/formatação. Um batch estrutural é validado antes de ser aplicado e falha atomicamente se uma requisição for inválida.

Fontes: [Read & write cell values](https://developers.google.com/workspace/sheets/api/guides/values), [values.append](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append), [Update spreadsheets](https://developers.google.com/workspace/sheets/api/guides/batchupdate).

## Escopos mínimos e escolha de armazenamento

Solicitar somente o escopo quando a pessoa acionar a funcionalidade (autorização incremental). Após o callback, verificar os escopos realmente concedidos com `hasGrantedAllScopes()`/`hasGrantedAnyScope()` e desabilitar a função se faltarem permissões.

| Necessidade | Escopo mínimo recomendado | Observação |
|---|---|---|
| Criar/manter arquivos próprios da aplicação no Drive | `https://www.googleapis.com/auth/drive.file` | Acesso limitado a arquivos que a aplicação criou ou que o usuário abriu/selecionou para ela; preferível a acesso amplo ao Drive. |
| Apenas listar metadados autorizados | `https://www.googleapis.com/auth/drive.metadata.readonly` | Não permite ler o conteúdo. Não é suficiente para baixar JSON ou ler células. |
| Ler/escrever valores em uma planilha conhecida | `https://www.googleapis.com/auth/spreadsheets` | Escopo sensível; necessário para o caso geral de uma planilha existente por `spreadsheetId`. |
| Criar/editar a planilha criada pela aplicação | `https://www.googleapis.com/auth/drive.file` (quando a operação e o arquivo se enquadrarem na limitação do escopo) | Validar em teste com o arquivo real; se o caso exigir acesso direto a uma planilha existente fora desse vínculo, usar `spreadsheets`. |
| Criar arquivo em qualquer local e acessar o Drive inteiro | `https://www.googleapis.com/auth/drive` | Evitar no frontend; amplo e sujeito a requisitos adicionais de verificação. |

Para o MVP, a opção mais restrita é: Drive para backup próprio com `drive.file`; Sheets somente se houver requisito de escrever na planilha existente, pedindo `spreadsheets` em uma ação separada. Não pedir `drive` apenas para fazer upload. Scopes sensíveis/restritos podem exigir verificação da aplicação; isso não é substituído por o OAuth client ser público.

Fontes: [files.create — authorization scopes](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create), [values.append — authorization scopes](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append), [OAuth scopes](https://developers.google.com/identity/protocols/oauth2/scopes), [OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies).

## CORS, origens e consentimento

- O token model do GIS é desenhado para APIs Google chamadas por REST/CORS no browser; isso não significa que qualquer URL externa ou endpoint próprio terá CORS habilitado.
- Usar `fetch` com `Authorization: Bearer TOKEN`; não colocar token em query string.
- A origem do site precisa estar cadastrada em **Authorized JavaScript origins** e coincidir exatamente em esquema, host e porta. Produção deve usar HTTPS e domínio controlado pelo projeto; `http://localhost` é para desenvolvimento.
- Para o token model popup, a origem JavaScript é a configuração principal. Redirect URI é relevante ao redirect/code model e deve coincidir exatamente com uma URI autorizada.
- Não usar iframe/embedded user-agent para login. O GIS abre o UX de conta/consentimento suportado pelo Google; o token flow atual suporta dialog UX.
- A tela de consentimento deve explicar uso, política de privacidade e termos; produção precisa de homepage pública no domínio verificado. Em modo de teste, cadastrar as contas em **Test users**; a autorização de teste pode ter limitações e expiração conforme o estado do projeto.
- O usuário pode conceder apenas parte dos escopos. Tratar `403`, `insufficientPermissions`, `401` e `invalid/expired token` sem repetir prompts automaticamente; pedir escopo adicional somente após intenção clara de usar aquela função.
- CORS não contorna OAuth: um token válido ainda precisa ter o escopo, o arquivo e a permissão corretos. Erros de CORS devem ser diagnosticados no endpoint/origem, não resolvidos expondo credenciais.

Fontes: [Use the token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [OAuth 2.0 for client-side web applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow), [OAuth errors](https://developers.google.com/identity/oauth2/web/guides/error), [OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies).

## Passos manuais no Google Cloud Console

1. Criar ou selecionar um projeto dedicado.
2. Em **APIs & Services → Library**, habilitar **Google Drive API** e **Google Sheets API**.
3. Em **Google Auth Platform / OAuth consent screen**, escolher o tipo de usuário adequado, informar nome, e-mail de suporte, domínio autorizado, homepage, política de privacidade e termos; cadastrar escopos somente quando necessários.
4. Durante desenvolvimento, adicionar as contas que testarão o fluxo em **Test users**. Para publicar para outros usuários, revisar requisitos de verificação dos escopos solicitados.
5. Em **Credentials → Create credentials → OAuth client ID**, selecionar **Web application** e cadastrar cada **Authorized JavaScript origin** (por exemplo, `https://silvathiagoferreira.github.io` e a origem local de desenvolvimento). Não cadastrar curingas.
6. Copiar apenas o **client ID** para a configuração pública do frontend. Client secret não é necessário no token model e nunca deve entrar no repositório.
7. Confirmar que os IDs de pasta/arquivo/planilha usados pelo produto são configuração não sensível; não versionar tokens, cookies, dados pessoais ou conteúdo de saúde.
8. Testar primeiro com uma pasta/planilha `SYSTEM_TEST`, registrando somente resultado e horário. Confirmar escrita e leitura, revogação e reautorização antes de habilitar sincronização real.

## Regras operacionais para este projeto

- Enviar para Drive/Sheets somente dados agregados/derivados explicitamente aprovados; nunca ECG, PPG, R-R ou raw de alta frequência.
- Rotular valores como `RAW`, `MEASURED`, `DERIVED`, `ESTIMATED`, `MOCK` ou `UNKNOWN`; a API Google não transforma a proveniência do dado.
- Manter access token somente em memória sempre que possível; limpar ao sair/desconectar e oferecer revogação via `google.accounts.oauth2.revoke(token, callback)`.
- Ao receber `401`, obter novo token via gesto do usuário. Não tentar fabricar refresh token no frontend.
- Em caso de revogação, consentimento parcial ou perda de acesso ao arquivo, marcar a sincronização como `BLOCKED` e preservar a fila local para uma ação posterior; não alegar sincronização concluída.
