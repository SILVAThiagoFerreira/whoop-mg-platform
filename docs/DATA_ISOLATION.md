# Isolamento de dados por conta

> **Atualização 2026-08-17:** o modelo anterior de criação e leitura direta pelo browser foi removido. O Pages agora solicita apenas identidade Google. Drive/Sheets são uma implementação server-side opcional; sem backend configurado, nenhum arquivo Google é criado ou consultado.

**Status:** desenho account-first auditado — 2026-08-16  
**Objetivo:** garantir que cada conta Google tenha um namespace e um destino Drive/Sheets próprio, sem transformar GitHub Pages em banco ou backend multi-tenant.

## Regra central

Uma conta do WHOOP MG Lab é uma identidade Google escolhida no GIS, não uma sessão anônima, e-mail digitado ou ID de uma planilha. O armazenamento canônico do piloto é:

```text
Google account (GIS/OIDC sub)
  └── account_id versionado e opaco
       ├── appDataFolder: manifesto de configuração da conta
       └── My Drive: pasta privada da conta
             └── planilha privada da conta
```

O access token do Google e a ACL do arquivo são a autoridade efetiva. `account_id`, `folder_id`, `spreadsheet_id`, nomes e chaves locais servem para roteamento e verificação, nunca para conceder acesso por si sós.

Dados de saúde, uso de dispositivo e qualquer métrica derivada são dados pessoais sensíveis. A proveniência precisa permanecer explícita: `RAW`, `MEASURED`, `DERIVED`, `ESTIMATED`, `MOCK` ou `UNKNOWN`. `MOCK` não pode ser misturado com dados medidos sem um campo visível.

## Identificadores

Usar os seguintes identificadores, com funções distintas:

| Identificador | Origem | Uso | Não usar para |
| --- | --- | --- | --- |
| `account_id` | Hash versionado de `google:<client_id>:<OIDC sub>` | Namespace local, manifesto e diagnóstico redigido | Autorização, e-mail ou nome exibido |
| `installation_id` | Aleatório, gerado uma vez por instalação | Distinguir filas/dispositivos e diagnosticar sync | Identidade global do usuário |
| `device_id` | Aleatório por collector/dispositivo, se necessário | Proveniência do equipamento | Número de série ou endereço BLE como chave pública |
| `event_id` | Determinístico a partir de conta/dispositivo/tempo/seq ou hash do evento | Idempotência e deduplicação | Segredo ou prova de autenticidade do sensor |
| `folder_id` / `spreadsheet_id` | Google Drive/Sheets | Referenciar arquivos criados pelo app | Permissão sem um access token válido |

Não usar e-mail, nome, avatar, endereço BLE, serial ou um ID digitado como `account_id`. E-mail pode mudar; o `sub` é o identificador OIDC apropriado dentro do client ID. Se client IDs de desenvolvimento e produção forem diferentes, os namespaces são diferentes e a migração deve ser explícita e confirmada pelo usuário.

O `account_id` pode ser armazenado em `appProperties` e no manifesto, mas deve ser tratado como dado pseudonimizado, não como segredo. Validar sempre a versão do esquema e recusar registros sem identidade/proveniência coerentes.

## Layout Drive/Sheets por conta

No primeiro “Conectar armazenamento” para uma conta:

1. Solicitar apenas `drive.appdata` e `drive.file`, incrementalmente e com explicação.
2. Ler o manifesto dessa conta no `appDataFolder`. Essa pasta é oculta, própria do app e não deve conter dados de saúde; serve para tornar a descoberta multi-device possível.
3. Se não houver manifesto, criar uma pasta visível privada, por exemplo `WHOOP MG Lab — <short account_id>`, e uma planilha filha, por exemplo `WHOOP MG Lab — metrics`. Preferir criar ambos pelo app, com `appProperties` como `whoop_schema_version`, `whoop_account_id`, `whoop_role` e `created_at`.
4. Gravar no manifesto somente IDs, versão, estado de migração e metadados mínimos. Nunca gravar access token, refresh token, payload BLE, ECG, PPG ou R-R no `appDataFolder`.
5. Antes de qualquer leitura/escrita, buscar os IDs pelo access token atual e conferir tipo MIME, parent esperado, `appProperties`, conta e estado de compartilhamento. Se houver divergência, parar e pedir reconciliação; não “procurar por nome” em toda a unidade.

Cada conta deve possuir seu próprio conjunto de arquivos. A planilha atualmente chamada `Whoop_database` ou qualquer pasta compartilhada não pode ser reaproveitada como destino multi-conta sem migração individual, ACL privada e teste com duas contas. Não colocar dados de vários usuários em abas separadas de uma planilha comum: uma ACL de arquivo protege o arquivo inteiro, não uma aba.

ACL esperada: proprietário da conta, sem `anyone with the link`, sem publicação na web e sem colaborador adicional por padrão. Se o proprietário compartilhar manualmente, o WHOOP MG Lab não consegue restaurar o isolamento; deve avisar que qualquer colaborador recebe acesso ao arquivo completo. Não usar Apps Script anônimo ou URL secreta como camada de isolamento.

`drive.file` é intencionalmente restrito aos arquivos criados pelo app ou escolhidos pelo usuário. Não pedir `drive`, `drive.readonly`, `drive.metadata` ou `spreadsheets` para localizar dados de todas as unidades. O escopo `spreadsheets` é amplo para todas as planilhas da conta e só poderia ser adotado por uma decisão de produto e verificação separadas.

## Separação no navegador

- Chaves de IndexedDB, se necessárias para a fila, devem incluir `account_id` e `installation_id`; não persistir tokens ali. Preferir manter apenas a fila mínima e exportável.
- Memória, workers, filas e estados do React devem carregar uma `session_epoch` e uma referência imutável à conta. Toda resposta assíncrona compara a época antes de atualizar UI ou persistência.
- Ao trocar de conta ou fazer logout, cancelar requisições, limpar estado da conta anterior e emitir apenas um evento de encerramento via `BroadcastChannel`. Nunca enviar token, payload ou PII nesse canal.
- O service worker deve cachear shell, fontes e assets auditados. Não cachear URL de Drive/Sheets, JSON de saúde, planilhas, tokens ou respostas que possam sobreviver a logout.
- Não incluir `account_id`, e-mail, IDs de arquivo ou métricas em URL, query string, fragmento, nome de asset público, logs ou telemetria.
- Um browser profile, extensão ou OS comprometido pode ler dados enquanto estão na tela ou na memória. Namespacing no IndexedDB não é criptografia nem isolamento contra o usuário do dispositivo.

## Multi-device

O fluxo normal para um segundo dispositivo é: GIS seleciona a mesma conta → OAuth autoriza os mesmos escopos → o segundo dispositivo lê o manifesto no `appDataFolder` → usa os mesmos IDs de pasta/planilha → valida ACL e esquema antes de sincronizar. A pasta e a planilha são por conta, não por instalação.

Limitações que precisam aparecer na UI:

- Dois dispositivos podem executar a inicialização simultaneamente e criar pastas/planilhas duplicadas; sem backend não existe transação global. Usar nome/`appProperties`/manifesto para detectar duplicata, escolher um manifesto canônico de forma determinística e mostrar os excedentes para reconciliação. Não apagar automaticamente dados.
- O collector deve manter a fonte de verdade local e uma fila com `event_id`, `installation_id`, `schema_version`, timestamp UTC, checksum/proveniência e estado `PENDING`, `SENT`, `ACKED` ou `ERROR`. Retry após timeout deve ser seguro ou voltar a `PENDING` para revisão.
- Sheets deve ser append-only para eventos sincronizados; incluir `event_id` e um log de sync. Leitura antes de escrita reduz duplicata, mas não elimina a race entre dois dispositivos. Para risco aceitável, escolher um escritor ativo; para uso multi-device real, usar uma aba por instalação e uma reconciliação explícita.
- Conflitos de mesmo `event_id` com conteúdo diferente são anomalia, não “última escrita vence”. Preservar a evidência, marcar `UNKNOWN`/conflito e pedir decisão.
- Ordem de chegada não é ordem clínica. Ordenar por timestamp UTC validado e manter `received_at` separado. Falhas de quota, rede, token ou edição manual devem ser visíveis e não apagar a fila local silenciosamente.

O desenho oferece isolamento de destino e eventual sync, não consistência forte, relógio global, resolução automática de conflitos nem recuperação garantida de um dispositivo perdido. Para processamento contínuo, múltiplos usuários com SLA ou escrita concorrente importante, é necessário um serviço de backend e uma política de custo diferente.

## Threat model de isolamento

| Ameaça | Controle de isolamento | O que permanece possível |
| --- | --- | --- |
| Conta A recebe a sessão da conta B | `sub` namespaced, manifesto por conta, limpeza atômica ao trocar | Usuário pode escolher a conta B de propósito |
| Usuário manipula `account_id`/IDs locais | Token Google + verificação de MIME/parent/propriedades/ACL | Cliente adulterado pode tentar requests; Google deve negar os que não pertencem ao token |
| Link de Drive publicado | ACL privada, teste anônimo e auditoria de permissões | Proprietário/colaborador pode compartilhar, copiar ou exportar |
| Pasta/planilha antiga compartilhada | Não usar legado como padrão; migração por conta e teste A/B | Dados já expostos não podem ser desexpostos por código novo |
| Aba separada em arquivo comum | Um arquivo por conta; nunca confiar em aba para segurança | Editor do arquivo vê todas as abas |
| XSS ou extensão | Sem tokens persistidos, CSP, escaping, sem cache de dados | Token e dados em memória podem ser roubados durante a sessão |
| Dois devices ou abas escrevem juntos | `event_id`, fila, versão, append-only, reconciliação | Race, duplicata e latência continuam possíveis |
| Planilha contém HTML/fórmula/CSV perigoso | Validar/escalar como texto e não renderizar markup | Programa externo que abre um CSV pode interpretar fórmula |
| Google account comprometida | MFA/passkeys e revogação no Google, ACL mínima | O app não consegue isolar dados de um proprietário comprometido |
| Pages ou dependência adulterado | Revisão, lockfile, secret/PII scan, inspeção do artefato | O cliente publicado é código executável público e precisa ser confiado |

## Exportação, exclusão e retenção

Exportar por ação explícita, em formato versionado, com classificação/proveniência e opção de criptografia local. Informar ao usuário que o export cria outra cópia.

Para exclusão: parar sync, exportar se confirmado, apagar fila/cache/local state, remover manifesto e solicitar exclusão da pasta/planilha criadas pelo app. Revogar OAuth é um passo separado. A exclusão não prova que desapareceram lixeira, histórico de versões, backups do Google, downloads, cópias compartilhadas ou dados em outros devices; a UI deve dizer isso em vez de prometer apagamento absoluto.

Não usar GitHub Pages, repositório, artefato, issue, screenshot, fixture ou logs como cópia de dados. O dashboard público deve conter somente shell e demo claramente `MOCK`.

## Verificações de aceite

- [ ] Conta A e conta B, em navegadores/dispositivos distintos, criam pastas e planilhas distintas; nenhuma ACL é `anyone` ou pública.
- [ ] Conta B não consegue ler a pasta/planilha A com seu próprio access token (`403`/equivalente); usuário anônimo não consegue ler nenhuma.
- [ ] Segundo dispositivo da conta A reencontra o manifesto e os mesmos IDs sem solicitar acesso à unidade inteira.
- [ ] Dois dispositivos iniciados ao mesmo tempo não causam perda silenciosa; duplicatas são detectadas, preservadas ou colocadas em reconciliação.
- [ ] Troca A → B durante leitura/escrita não exibe nem grava dados A no namespace B.
- [ ] Logout/revogação limpa tokens em memória, filas/cache pessoal e todas as abas; uma resposta atrasada é descartada.
- [ ] Bundle, URLs, service worker, logs e Pages não contêm PII, tokens, conteúdo de Sheets ou banco.
- [ ] Dados `RAW`, `MEASURED`, `DERIVED`, `ESTIMATED`, `MOCK` e `UNKNOWN` permanecem distinguíveis em toda exportação/sincronização.
- [ ] Quota, offline, edição manual, mudança de ACL e arquivo removido produzem estado explícito e não sobrescrevem outro account namespace.

## Garantias não oferecidas pelo GitHub Pages

Pages não consegue impor isolamento de dados em nível de servidor, bloquear cópia do bundle, validar tokens de forma confiável fora do navegador, esconder client ID, proteger contra XSS/extensões, oferecer cookies `HttpOnly`, executar tarefas em background, fornecer transação multi-device, apagar cópias externas ou garantir custo/quota/ disponibilidade permanentes. O compromisso correto é: **cada chamada a Google é feita pelo usuário autenticado, com escopos mínimos, e os arquivos são separados e privados por conta conforme ACL verificável**. Isso é uma condição de segurança testável para um piloto; não é uma garantia de segurança absoluta nem um backend multi-tenant.

## Divergências observadas no snapshot atual

Esta auditoria registra o estado do código, mas não o altera. Antes de habilitar dados reais, os seguintes pontos precisam ser corrigidos ou aceitos formalmente como risco:

- `apps/web/src/data/accountStore.ts` grava o `sub` bruto em `appProperties`, usa o mesmo marcador para localizar arquivos e não mantém manifesto por conta no `appDataFolder`. Isso não fornece o namespace versionado/opaco definido acima.
- A busca de pasta e planilha não restringe o resultado à relação pai esperada. Ela pode escolher o primeiro arquivo com o marcador da conta, inclusive um arquivo órfão ou duplicado. A planilha deve ser verificada como filha da pasta canônica e duplicatas devem entrar em reconciliação, nunca ser escolhidas silenciosamente.
- A inicialização atual grava `spreadsheetId` na célula `CONFIG.account_id`, em vez do `account_id` canônico. Isso confunde identidade e endereço do arquivo e precisa ser corrigido no esquema antes de aceitar qualquer sincronização.
- O cliente pede `https://www.googleapis.com/auth/spreadsheets`, que permite acesso amplo às planilhas da conta. O caminho account-first deve testar `drive.file` para arquivos criados pelo app; se o caso exigir `spreadsheets`, deve haver consentimento/justificativa/verificação separados.
- A criação da planilha e a sua associação à pasta são operações distintas e podem deixar arquivo órfão ou duplicado em uma corrida multi-device. A inicialização precisa ser idempotente, verificar pais/ACL e registrar a decisão no manifesto.
- A sessão atual guarda perfil em `sessionStorage` e não há fence de sessão/cancelamento entre abas. Uma troca de conta precisa limpar filas, estado e respostas atrasadas antes de iniciar a nova descoberta.

Até esses itens passarem pelos testes A/B, a interface deve tratar o storage como `BLOCKED`/experimental e não alegar isolamento ou sincronização concluída.
