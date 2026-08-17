# Autenticação account-first

**Status:** desenho auditado — 2026-08-16  
**Escopo:** Google Identity Services (GIS), GitHub Pages estático e acesso direto, iniciado pelo usuário, ao Google Drive/Sheets.

## Veredito

O desenho é viável para uso pessoal ou um piloto pequeno sem servidor pago: o Pages entrega somente o cliente, o GIS identifica a conta no navegador e o OAuth concede um access token de curta duração para que o próprio navegador chame as APIs Google. Isso não transforma o Pages em um backend confiável nem em uma barreira contra um navegador comprometido.

O produto deve ter dois atos distintos:

1. **Entrar:** usar o botão do GIS para obter um ID token OIDC e conhecer a identidade escolhida.
2. **Conectar o armazenamento:** após uma ação explícita, usar a autorização GIS para obter um access token com escopos mínimos e criar/usar os arquivos daquela conta.

Não usar o ID token para chamar Drive/Sheets, não tratar e-mail como identificador e não considerar “login” concluído enquanto a conta do token e o armazenamento da sessão não estiverem coerentes.

Referências normativas: [GIS para autenticação e autorização](https://developers.google.com/identity/oauth2/web/guides/overview), [token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [OIDC Sign in with Google](https://developers.google.com/identity/openid-connect/openid-connect) e [escopos do Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## Limites de confiança

| Componente          | O que pode afirmar                                                                                                    | O que não pode afirmar                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GitHub Pages        | Entrega um bundle público por HTTPS                                                                                   | Que o JavaScript é secreto, íntegro contra extensão/XSS ou capaz de proteger um segredo                               |
| GIS ID token        | Que o Google emitiu uma credencial para um `sub`, `aud`, `iss` e `exp` específicos, se a validação adequada for feita | Que o portador pode ler ou escrever Drive                                                                             |
| Google access token | Que a API Google autorizará operações permitidas pelos escopos e pela ACL da conta                                    | Que a aplicação cliente está livre de malware ou que o token não foi copiado antes do logout                          |
| `account_id` local  | Roteamento, nomespacing e associação de estado                                                                        | Autorização; é um identificador manipulável pelo cliente                                                              |
| Drive/Sheets        | Controle de acesso da conta Google e persistência do arquivo                                                          | Banco transacional, isolamento contra o próprio proprietário/colaboradores ou exclusão instantânea de todas as cópias |

Sem um backend, não há sessão de servidor, cookie `HttpOnly`, client secret protegido, registro confiável de contas ou política de autorização executada fora do navegador. A fronteira efetiva de autorização é Google + ACL do arquivo, não o código do Pages.

## Fluxo obrigatório

1. Servir o site somente em HTTPS e registrar no cliente OAuth apenas a origem real do Pages e origens locais de desenvolvimento. Carregar a biblioteca oficial GIS com `https://accounts.google.com/gsi/client`; nenhuma cópia adulterada ou script arbitrário deve receber dados.
2. Renderizar o botão GIS. Não pedir Drive/Sheets no primeiro clique de login. One Tap/automatic sign-in são opcionais e não devem iniciar uma sincronização silenciosa.
3. Receber o ID token em memória. Para um cliente puramente estático, seus claims podem orientar a UI, mas não são uma autorização de backend: o cliente não deve alegar que fez validação criptográfica de servidor. Se futuramente houver backend, ele deve validar assinatura, `iss`, `aud`, `exp`, `iat`, `nonce` e usar o `sub`; nunca aceitar um JWT apenas decodificado.
4. Exibir claramente a conta selecionada, sem usar o e-mail como chave. Se a conta mudar, descartar o estado anterior antes de prosseguir.
5. Somente após “Conectar Google Drive” pedir incrementalmente `drive.appdata` e `drive.file`. Para um arquivo já existente, o usuário deve escolhê-lo explicitamente pelo Picker; nunca procurar ou abrir toda a unidade.
6. Criar ou ler no `appDataFolder` um manifesto pequeno contendo `schema_version`, `account_id`, `folder_id`, `spreadsheet_id` e timestamps. Criar, na unidade visível, uma pasta e uma planilha dedicadas à conta. Conferir que os IDs retornados, o `mimeType`, `appProperties` e a conta do access token correspondem ao manifesto antes de ler/escrever.
7. Fazer chamadas Drive/Sheets somente com o access token em memória, `fetch` HTTPS e payload validado. Colocar eventos com `event_id` estável, UTC, versão e proveniência (`RAW`, `MEASURED`, `DERIVED`, `ESTIMATED`, `MOCK` ou `UNKNOWN`). O retry deve ser idempotente ou permanecer em fila local para decisão do usuário.
8. Ao receber `401`, `403`, `invalid_grant` ou escopo insuficiente, parar a sincronização, limpar o token e pedir nova autorização. Não tentar ampliar escopos automaticamente.

O token model do GIS é adequado para chamadas em foreground, mas entrega access tokens de curta duração. Não há refresh token persistente seguro em um bundle público. Sincronização contínua, job em background ou refresh token exige um collector nativo com armazenamento protegido ou um backend separado; isso muda o custo e o threat model.

## Escopos e consentimento

Escopos iniciais recomendados:

| Escopo                                                              | Uso                                                                     | Decisão                                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `openid` + `profile` (e `email` somente se a UI realmente precisar) | Identidade GIS                                                          | `sub` é a chave; e-mail é atributo mutável e PII                                    |
| `https://www.googleapis.com/auth/drive.appdata`                     | Manifesto de IDs por conta, invisível ao usuário                        | Permitir somente configuração do app; não colocar métricas de saúde nele            |
| `https://www.googleapis.com/auth/drive.file`                        | Criar/editar apenas a pasta e a planilha criadas ou escolhidas pelo app | Preferir esse escopo não sensível; ele também é recomendado para Sheets por arquivo |

Não pedir `drive`, `drive.readonly`, `drive.metadata`, `drive.metadata.readonly` ou `spreadsheets` no MVP. `spreadsheets` concede acesso a todas as planilhas da conta e é sensível; só pode ser aprovado por decisão explícita, justificativa de produto, verificação Google e teste de revogação. Não usar `drive.file` para fingir que a aplicação pode acessar qualquer arquivo existente: o arquivo precisa ter sido criado pelo app ou escolhido/compartilhado pelo usuário no fluxo suportado.

Explicar na tela o que será criado, onde ficará e quais dados irão para a planilha. Pedir escopos incrementais apenas quando a função correspondente for acionada; se o usuário negar, manter o dashboard local e o modo demo funcionando sem retry agressivo.

## Identidade e `account_id`

O identificador canônico é o `sub` do OIDC, dentro de um namespace do client ID:

```text
account_id = g1_ + base64url(SHA-256("google:" + client_id + ":" + sub))
```

O valor deve ser versionado, opaco na UI e usado para namespacing. O `sub` bruto, e-mail, nome, foto e ID da pasta não devem aparecer em URLs, logs, nomes de arquivo público, query string ou fixtures. O hash não é segredo nem prova de identidade.

O client ID entra no namespace porque o `sub` pode ser diferente entre projetos/client IDs. Trocar o client ID de produção exige migração explícita do manifesto; não juntar automaticamente dois `account_id`. Nunca aceitar um `account_id` vindo de `localStorage`, URL ou planilha como autorização: a cada operação, o access token da conta atual e os IDs do manifesto precisam ser rechecados.

## Tokens, armazenamento e logout

- Client ID OAuth é público e pode estar na configuração do bundle; client secret, service-account key e refresh token nunca podem estar no Git, no Pages, em Apps Script público, em Sheets ou em logs.
- Manter ID token, access token, perfil e claims somente em memória. Não usar `localStorage`, URL, fragmento, IndexedDB ou cache de service worker para tokens. Não colocar tokens em mensagens de erro, analytics, referrer ou parâmetros de busca.
- Limitar o tempo de vida da sessão à expiração do access token e pedir novo consentimento em foreground. Não simular uma sessão eterna com um token vencido.
- O logout local deve: marcar a sessão como encerrada, invalidar um `session_epoch` usado por toda requisição, abortar requests, limpar access token/ID token/perfil/manifestações da memória, limpar filas e dados locais da conta conforme a política de retenção, remover caches pessoais e avisar outras abas via `BroadcastChannel` sem transportar credenciais.
- Logout não é revogação. Oferecer uma ação separada “Desconectar e revogar acesso”, revogar o access token por `google.accounts.oauth2.revoke` quando disponível e orientar o usuário para a página de terceiros do Google se a chamada falhar. A revogação pode levar algum tempo e não apaga os arquivos.
- Ao trocar de conta, executar o mesmo fence de sessão e exigir a descoberta do manifesto da nova conta antes de exibir ou sincronizar qualquer dado. Uma resposta atrasada da conta A deve ser descartada se `session_epoch` mudou.
- “Apagar meus dados” é outra ação, com confirmação, exportação opcional e exclusão dos arquivos criados pelo app. Revogar, fazer logout ou apagar o manifesto não apaga cópias que o usuário compartilhou, baixou, duplicou ou manteve em outro dispositivo.

Não é possível garantir, em um frontend estático, que um access token já exfiltrado por XSS, extensão, malware, DevTools ou outra aba comprometida deixe de ser usado no exato instante do logout. O controle residual é expiração/revogação no Google, invalidação local e minimização do tempo em memória.

## XSS e cadeia do cliente

Uma vulnerabilidade XSS equivale a roubo de access token e dos dados visíveis daquela conta. React não é uma garantia contra HTML perigoso vindo de planilha, CSV, nomes de arquivo ou campos de erro.

- Usar renderização textual/escaping; proibir `dangerouslySetInnerHTML`, `eval`, `new Function`, templates HTML e URLs não validadas. Tratar conteúdo de Sheets como dados, nunca como markup ou instrução.
- Fixar dependências e revisar o bundle antes de publicar. Um pacote comprometido tem a mesma autoridade do app durante a sessão.
- Adotar CSP restritiva (sem `unsafe-eval`; `connect-src` somente para Google e endpoints necessários), `Referrer-Policy: no-referrer`, sandbox para conteúdos externos e SRI quando aplicável. A meta CSP é defesa adicional, não substituto de headers.
- O Pages não oferece garantia de que headers arbitrários serão configurados; confirmar a política no artefato publicado e manter todo segredo fora do cliente. Service worker deve cachear apenas shell/assets auditados, nunca respostas de Drive/Sheets.
- Não exibir PII em logs, telemetry, mensagens de URL, screenshots de teste, fixtures ou dados demo. Testar account switch, logout e uma planilha com strings que tentem injetar HTML/JavaScript.

## Threat model

| Ator/ameaça                               | Impacto                                  | Controles                                                                          | Residual                                                        |
| ----------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Visitante anônimo                         | Baixar o bundle e inspecionar o produto  | Pages sem PII/token/banco; Drive privado; APIs exigem token                        | O código e client ID são públicos                               |
| Conta errada no seletor Google            | Mistura de dados                         | Mostrar conta, namespace por `sub`, manifesto em `appDataFolder`, limpar ao trocar | Usuário pode escolher deliberadamente a conta errada            |
| Token roubado                             | Leitura/escrita da autorização concedida | Memória, HTTPS, escopos mínimos, expiração e revogação                             | XSS/extensão/malware pode agir antes da revogação               |
| XSS, dependência ou script GIS adulterado | Exfiltração de token e dados             | CSP, dependências fixadas, escaping, revisão de bundle                             | Sem backend não há isolamento confiável do navegador            |
| Colaborador/link público no Drive         | Exposição da planilha                    | ACL privada, sem `anyone`, auditoria periódica e alerta de compartilhamento        | Proprietário pode compartilhar ou duplicar o arquivo            |
| Dados de Sheets como payload ativo        | XSS/CSV injection                        | Texto escapado, validação de tipo/tamanho, exportação segura                       | O próprio usuário pode abrir CSV em um programa perigoso        |
| Dois dispositivos escrevendo              | Duplicatas, perda ou conflito            | `event_id`, fila local, append-only, versão e reconciliação                        | Sheets não oferece transação/deduplicação global                |
| Google/API indisponível ou quota excedida | Sync atrasado                            | Offline-first, backoff, exportação local e status visível                          | Não há SLA nem garantia de quota gratuita                       |
| Compromisso da conta Google               | Todos os arquivos daquela conta          | MFA/passkeys no Google, ACL mínima e revogação                                     | O app não consegue proteger uma conta Google comprometida       |
| Repositório/Pages adulterado              | Código malicioso para todos              | Branch protection, revisão, secret scan e inspeção do bundle                       | Pages é público e o usuário precisa confiar na origem publicada |

## O que o Pages não pode garantir

Este projeto não deve anunciar garantias que dependem de servidor:

- confidencialidade ou integridade do JavaScript publicado, segredo de client, sessão `HttpOnly` ou validação server-side do ID token;
- isolamento contra XSS, extensão, malware, navegador/OS comprometido ou token já copiado;
- refresh token seguro, sincronização contínua em background, fila global, rate limit por conta, auditoria imutável ou recuperação de sessão;
- que `account_id` ou um ID de Drive não seja alterado pelo usuário no cliente; a proteção é a ACL e o token Google;
- atomicidade/consistência de banco, ausência de duplicatas em multi-device ou apagamento de toda cópia em cache, papelera, histórico, backup e download;
- disponibilidade, quota, preço zero permanente ou política futura do GitHub/Google. “R$ 0/mês” é alvo operacional para uso pessoal dentro das cotas, não SLA nem promessa comercial;
- conformidade automática com LGPD, requisitos clínicos, segurança de dispositivo, retenção legal ou obrigações de controlador/operador.

## Divergências observadas no snapshot atual

Após a implementação account-first, permanecem estes pontos de hardening antes de considerar o fluxo pronto para uso sensível em escala:

- O MVP usa `openid profile email` + `drive.file` em uma autorização GIS no navegador. A conexão é account-first e não pede `spreadsheets` amplo, mas ainda pode evoluir para consentimento incremental separado entre identidade e armazenamento.
- O perfil e o access token ficam somente em memória e o logout revoga o token quando possível. Ainda falta implementar `session_epoch`, cancelamento de requisições e aviso entre abas para proteger contra respostas atrasadas durante troca de conta.
- O MVP localiza a pasta/planilha por `appProperties` e `account_id` opaco com namespace do client ID. Um manifesto em `appDataFolder` continua sendo hardening futuro para descoberta multi-dispositivo mais robusta.
- O cliente não tem validação server-side de ID token — limitação inerente ao Pages — e não pode transformar o objeto retornado pelo browser em uma prova de sessão fora do próprio browser.

Esses pontos são bloqueadores de aceite para dados reais; o modo demo deve continuar sem consultar Drive/Sheets.

## Senha local e desktop

A senha do WHOOP MG Lab é independente da senha da Conta Google. Ela pode ser criada ou alterada em `More → Account Security` no web app, ou no painel de conta do desktop. O Google nunca recebe essa senha e o produto nunca tenta alterar a senha Google.

No desktop, o login Google abre o dashboard publicado no navegador padrão e retorna uma credencial de curta duração por um callback `127.0.0.1` criado somente durante o fluxo. O Electron confirma a identidade com `userinfo`, armazena o perfil no cofre local (`safeStorage`) e não expõe o access token ao renderer nem o persiste em `localStorage`. A senha local usa `scrypt` no processo principal do Electron; no Pages, o armazenamento local usa PBKDF2 para manter a senha fora do texto puro.

## Critérios de aceite

- [ ] Login não pede Drive/Sheets; conexão de storage é uma ação incremental e mostra escopos.
- [ ] Nenhum token, e-mail, `sub`, PII, banco ou resposta Google aparece no bundle, URL, log ou service-worker cache.
- [ ] Conta A e B criam e leem somente suas pastas/planilhas; conta anônima recebe erro de autorização.
- [ ] Troca de conta durante uma requisição não mostra nem grava resposta da conta anterior.
- [ ] Logout local impede requests pendentes e limpa todas as abas; revogação é testada separadamente.
- [ ] XSS fixtures, dependência fixada, CSP e permissões OAuth são verificados no build e no site publicado.
- [ ] Expiração, `401/403`, quota, revogação e offline não causam perda silenciosa nem loop de consentimento.
- [ ] O modo sem Google continua seguro e funcional com `MOCK` claramente marcado.
