# Auditoria independente da arquitetura

**Escopo:** segurança de dados pessoais e viabilidade de custo recorrente zero para GitHub Pages, Google Drive/Sheets, SQLite, PWA iOS, collector BLE e MCP.

**Data:** 2026-08-16  
**Classificação dos dados:** dados de saúde e de uso de dispositivo devem ser tratados como dados pessoais sensíveis.  
**Base observada:** o checkout contém um frontend React/Vite mínimo, configuração PWA, `.env.example`, documentação de produto/pesquisa e diretórios reservados para collector, database, sync e MCP. Os módulos desses diretórios não estão materializados no snapshot auditado, e não há histórico Git acessível. A revisão combina os artefatos disponíveis com uma revisão de desenho/ameaças; os critérios abaixo são obrigatórios antes de declarar a implementação pronta.

### Achados imediatos do snapshot

- O README declara que Pages deve publicar somente shell e demo, e que dados brutos, SQLite, exports e tokens ficam fora do Git. Essa é uma boa decisão, mas precisa de testes no artefato publicado, não apenas de convenção.
- `apps/web/vite.config.ts` habilita `vite-plugin-pwa` com `registerType: autoUpdate` e `navigateFallback`. É necessário provar que o service worker não intercepta/cacheia respostas de API ou dados pessoais e que uma atualização não remove dados locais.
- `apps/web/package.json` usa versões `latest`. Isso reduz reprodutibilidade e aumenta risco de supply chain; versões devem ser fixadas e atualizadas por processo explícito antes de produção.
- `.env.example` contém IDs específicos de pasta/planilha. IDs não são credenciais, mas revelam alvos e podem facilitar abuso quando permissões estiverem erradas; usar placeholders em repositório público ou documentar que os IDs são deliberadamente públicos, mantendo ACL privada.
- A pesquisa marca o histórico BLE do WHOOP 5.0/MG como `UNKNOWN`/experimental. O collector deve permanecer atrás de feature flag e nunca promover “HR ao vivo” a suporte histórico completo sem validação em hardware/firmware.

## Veredito

O objetivo de custo de infraestrutura recorrente igual a zero é tecnicamente viável para uso pessoal ou um piloto pequeno, desde que:

1. a aplicação seja local-first;
2. GitHub Pages hospede apenas arquivos estáticos públicos;
3. o Google Drive/Sheets seja um destino privado, explícito e de baixa frequência, não um backend público;
4. a coleta BLE seja feita por um aplicativo nativo iOS ou outro collector autorizado, e não por Web Bluetooth no PWA iOS;
5. o MCP seja local, via stdio, e somente leitura por padrão.

“Zero custo” não é uma garantia de disponibilidade ou de permanência dos limites gratuitos do GitHub, Google ou Apple. Hardware, domínio, conta de desenvolvedor Apple, eventuais quotas excedidas e mudanças de política ficam fora da garantia. Em particular, publicar um collector nativo na App Store exige a conta paga do Apple Developer Program; portanto, custo recorrente literalmente zero só é compatível com uso local/sideload dentro das limitações da plataforma, ou com um collector já disponível e autorizado. Para múltiplos usuários, SLA, processamento contínuo ou dados compartilhados, esta arquitetura deixa de ser suficiente sem um serviço de backend e orçamento operacional.

## Arquitetura recomendada

```text
Dispositivo BLE
    -> collector nativo iOS (validação e deduplicação)
    -> SQLite local protegido pelo iOS
    -> sincronização/exportação iniciada pelo usuário
    -> Google Drive/Sheets privado (dados mínimos ou exportação criptografada)

GitHub Pages -> somente shell estático do PWA, sem PII, tokens ou banco
PWA iOS     -> consulta/coordena dados locais e sincronização em foreground
MCP local   -> stdio -> diretório/banco local, ferramentas allowlisted, leitura por padrão
```

O fluxo de dados deve ser unidirecional e explícito. Nenhum componente publicado no GitHub Pages deve funcionar como proxy anônimo para o Google, como cofre de segredos ou como API de escrita sem autenticação.

O PWA não deve presumir acesso direto ao SQLite protegido do collector nativo. A fronteira recomendada é export/import explícito ou leitura dos dados já sincronizados no Drive após OAuth do próprio usuário; um app group, bridge HTTP local ou compartilhamento automático entre apps só deve ser adotado depois de um modelo de ameaça específico.

## Decisões recomendadas

| Área                | Decisão                                                                                                                                                                                                                          | Motivo e condição de aceite                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Pages        | **Apenas frontend estático público.** Não armazenar PII, SQLite, backups, access tokens, refresh tokens ou dados em query string/hash.                                                                                           | O conteúdo publicado pode ser baixado por qualquer pessoa e pode ser cacheado. O aceite exige inspeção do artefato final e busca automatizada por segredos/PII.                              |
| Google Drive/Sheets | **Destino privado e controlado pelo usuário**, com pasta/arquivo dedicado, compartilhamento restrito e escopos OAuth mínimos.                                                                                                    | Drive/Sheets são convenientes para um piloto, mas não oferecem as garantias de um banco transacional. O aceite exige ausência de links públicos, revogação testada e fila idempotente local. |
| Apps Script         | **Evitar endpoint público como backend.** Preferir APIs Google chamadas após OAuth do usuário; se Apps Script for inevitável, exigir autenticação, validação de esquema, limite de taxa, idempotência e nenhum segredo embutido. | Web Apps públicos executados como o proprietário transformam um link em uma superfície de exfiltração e abuso. Nunca publicar credenciais de serviço no Pages.                               |
| Dados no Google     | **Minimização e pseudonimização.** Preferir eventos/estatísticas necessárias, `device_id` aleatório e UTC; separar identificação civil de métricas.                                                                              | Reduz impacto de vazamento e facilita exclusão. Dados de saúde continuam sensíveis mesmo pseudonimizados.                                                                                    |
| SQLite do collector | **Banco local protegido**, com criptografia de arquivo ou proteção de dados nativa do iOS e chave no Keychain.                                                                                                                   | SQLite puro é legível se o arquivo ou um backup for obtido. WAL, journal, arquivos temporários e exports também precisam entrar no modelo de proteção.                                       |
| PWA iOS             | **Usar IndexedDB para estado web e cache apenas do shell.** Fazer sincronização em foreground, com retry e fila local.                                                                                                           | Web Storage/OPFS pode sofrer eviction; background sync é limitado e não confiável no iOS. O PWA não deve ser o único local de dados sem exportação recuperável.                              |
| BLE                 | **Collector nativo com CoreBluetooth**, dispositivo/serviço allowlisted, payload não confiável, deduplicação e validação de faixa.                                                                                               | Web Bluetooth não é uma base disponível/confiável no Safari/PWA iOS. BLE não deve ser considerado autenticado só porque houve conexão.                                                       |
| MCP                 | **Servidor local via stdio e somente leitura por padrão.** Ferramentas e caminhos allowlisted; escrita exige confirmação explícita.                                                                                              | Evita exposição de porta e reduz impacto de prompt injection, ferramenta maliciosa ou cliente MCP comprometido. Não enviar refresh tokens nem PII desnecessária ao modelo.                   |
| Observabilidade     | **Logs locais mínimos e redigidos.** Nunca registrar payload bruto de saúde, tokens, chaves ou conteúdo de prompts.                                                                                                              | Logs e crash reports são cópias de dados e frequentemente escapam do controle do banco principal.                                                                                            |
| Retenção            | **Política curta e configurável**, com exportação e exclusão verificáveis.                                                                                                                                                       | A arquitetura precisa atender apagamento, revogação e recuperação sem manter cópias invisíveis em cache, WAL, Sheets ou backups.                                                             |

## Controles por componente

### GitHub Pages e cadeia de build

- O repositório, issues, artifacts, releases e Pages devem ser considerados potencialmente públicos. Não colocar PII em fixtures, screenshots, exemplos, nomes de arquivo ou comentários.
- Remover secrets de builds e usar permissões mínimas no workflow (`contents: read` quando possível). Fixar ações e dependências por versão/digest; habilitar secret scanning e bloquear commits contendo credenciais.
- Adicionar CSP restritiva, sem `unsafe-eval`; restringir `connect-src` aos endpoints necessários. Usar dependências fixadas, SRI quando aplicável e revisar todo script de terceiros.
- Não confiar em headers que o Pages não permita configurar. A proteção principal é não publicar dados e tokens. Não usar URL, referer ou fragmento para transportar credenciais.
- O artefato de produção deve ser verificável como estático: nenhum endpoint de escrita, arquivo de banco ou configuração contendo client secret.

### Google Drive/Sheets

- Usar OAuth para o usuário, com client ID público somente onde apropriado. Client secret, service-account key e refresh token nunca vão para o bundle do PWA, Sheets, Apps Script ou Git.
- Preferir `drive.file` para arquivos criados pelo app; solicitar `spreadsheets` apenas se for indispensável acessar uma planilha existente. Explicar os escopos e oferecer revogação/desconexão.
- Manter a pasta e planilha com acesso privado, sem “anyone with the link”, publicação na web, fórmulas/imports externos ou colaboradores desnecessários. Separar dados brutos de relatórios agregados quando possível.
- Persistir localmente um `event_id`/hash estável, `schema_version`, timestamp UTC e estado de sincronização. A operação de upload deve ser repetível sem duplicar linhas e deve sobreviver a quota, timeout e perda de rede.
- Sheets não deve ser fonte de verdade concorrente nem mecanismo de autorização. Validar tamanho, tipo, faixa e versão de cada registro antes de escrever.
- Se houver Apps Script, não usar execução anônima nem “execute as me” aberto ao mundo. Validar autenticação e autorização no servidor, rejeitar origem/payload inesperado, limitar taxa, registrar apenas metadados redigidos e manter o script com escopo mínimo.

### SQLite e dados locais

- No iOS, usar proteção de arquivo (`NSFileProtectionComplete` ou política equivalente) e guardar a chave de criptografia no Keychain, protegido por passcode/biometria. A chave não pode ser derivada de um valor fixo no código.
- Proteger também WAL, journal, temporários, exports, diagnósticos e backups. `secure_delete` sozinho não substitui criptografia e política de retenção.
- Aplicar migrações versionadas, constraints de integridade e transação por lote. Rejeitar timestamps impossíveis, valores fora de faixa e payloads maiores que o limite.
- No navegador, não presumir que um SQLite WASM/OPFS é seguro ou durável. IndexedDB deve conter o mínimo necessário; não usar `localStorage` para saúde ou tokens.
- Exportação deve ser uma ação explícita, com formato versionado e, por padrão, criptografado no cliente. Confirmar ao usuário o destino e a existência de cópias. A exclusão deve remover o banco local, filas, caches e artefatos de exportação dentro do escopo do app.

### PWA iOS

- O service worker deve cachear somente shell, fontes e assets auditados. Nunca precachear respostas de API, planilhas, dados de saúde ou tokens.
- Implementar sincronização manual/em foreground, backoff, retomada e indicação de estado. Não prometer coleta ou upload em background contínuo no iOS.
- Tratar eviction, reinstalação e limpeza de dados do Safari como eventos esperados: oferecer exportação/importação e informar claramente a perda possível.
- Não usar o PWA como caminho BLE no iOS. O collector nativo deve entregar dados ao armazenamento local por um mecanismo delimitado e autenticado (por exemplo, export/import ou app group controlado), sem abrir uma porta HTTP geral.
- Tokens OAuth ficam em memória durante a sessão sempre que possível; se a persistência for necessária, usar armazenamento protegido da plataforma nativa, nunca `localStorage`.

### Collector BLE

- Solicitar somente permissões necessárias e mostrar texto de uso claro. Manter em allowlist os serviços/características esperados e rejeitar dispositivos desconhecidos.
- Tratar toda leitura como entrada não confiável: validar comprimento, versão, checksum, unidade, faixa física, monotonicidade e relógio. Gerar `event_id` local e rejeitar replay/duplicata.
- Usar pairing/bonding e criptografia BLE quando oferecidos pelo dispositivo, mas não assumir que isso autentica o fabricante. Se autenticidade for requisito, exigir mecanismo criptográfico suportado pelo protocolo; caso contrário, registrar o nível de confiança.
- Lidar com desconexão, bateria, troca de endereço aleatório, atualização de firmware e mudança de protocolo sem perder a fila nem duplicar eventos. Evitar varredura permanente por bateria e privacidade.
- Não contornar controles de acesso, engenharia reversa não autorizada ou termos do fabricante; registrar a origem e a versão do protocolo usada pelo collector.

### MCP

- Usar transporte stdio e iniciar o servidor somente junto ao cliente autorizado. Se HTTP/bridge for realmente necessário, vincular a loopback, exigir token aleatório por sessão, validar Origin/CSRF e não expor a interface na LAN/WAN.
- Expor uma pequena allowlist de operações tipadas, com diretórios permitidos. Bloquear traversal, symlinks inesperados, comandos arbitrários, SQL livre e acesso a arquivos fora do diretório de dados.
- Leitura é o default. Escrita, exclusão, sincronização e exportação exigem confirmação humana e mostram destino, quantidade e tipo de dados.
- Redigir PII em logs e respostas. Health data inserido no banco deve ser tratado como conteúdo, nunca como instrução; não permitir que texto armazenado altere as políticas do agente ou habilite ferramentas.
- Não entregar ao MCP credenciais Google, tokens BLE ou chaves de criptografia. O host MCP e seus plugins devem ser considerados código privilegiado e ter dependências/proveniência auditadas.

## Principais riscos e mitigação

| Risco                                                        | Severidade | Mitigação / decisão de aceite                                                                                                  |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| PII acidental no bundle, repositório ou Pages                | Crítica    | Pipeline com secret/PII scan, revisão do artefato e regra de que Pages não é armazenamento. Falha bloqueia release.            |
| Endpoint Apps Script público usado para ler/escrever dados   | Crítica    | Remover endpoint ou exigir autenticação/autorização e rate limit testados. “URL secreta” não é controle.                       |
| Token OAuth persistido em storage web ou vazando em URL/log  | Alta       | Memória/armazenamento protegido, redirecionamento HTTPS, revogação e inspeção de rede.                                         |
| Drive/Sheet compartilhado publicamente ou por link           | Crítica    | Auditoria de ACL antes de cada release e teste com conta anônima.                                                              |
| SQLite, WAL ou backup em claro                               | Alta       | Proteção de arquivo/criptografia, Keychain, teste de extração de backup e exclusão de cópias.                                  |
| Eviction/reinstalação do PWA causar perda silenciosa         | Alta       | Exportação, indicador de sincronização, importação e teste de reinstalação/limpeza.                                            |
| BLE spoofing, replay, payload inválido ou protocolo quebrado | Alta       | Allowlist, pairing, validação, event ID, monotonicidade, limites e testes de falha.                                            |
| MCP/LLM exfiltrar dados ou executar escrita indevida         | Crítica    | stdio local, allowlist, redaction, confirmação e testes de prompt injection/path traversal.                                    |
| Quotas ou política gratuita mudarem                          | Média      | Fila local, backoff, export offline, monitoramento de quota e critério explícito de “custo não garantido”.                     |
| Distribuição do collector iOS exigir conta Apple paga        | Média/alta | Declarar o modelo de distribuição antes do MVP. Não prometer “custo total zero” se houver App Store/TestFlight como requisito. |
| Retenção involuntária em logs, caches ou exports             | Alta       | TTL, limpeza verificável, logs sem payload e inventário de cópias.                                                             |

## Critérios de validação antes do primeiro release

### Segurança e privacidade

- [ ] O build publicado é estático e uma busca automatizada não encontra PII, tokens, chaves, client secret, refresh token ou banco.
- [ ] `connect-src`, dependências e permissões do workflow estão documentados e mínimos; nenhuma dependência de terceiros não auditada recebe dados pessoais.
- [ ] Um usuário anônimo consegue baixar o site, mas não consegue obter dados, endpoints de escrita ou arquivos do usuário.
- [ ] A política de privacidade identifica finalidade, dados coletados, retenção, exportação, exclusão, revogação e contato. Para uso além de âmbito pessoal, a base legal e os direitos aplicáveis (incluindo LGPD) foram revisados por responsável competente.

### Google

- [ ] OAuth mostra escopos mínimos, usa HTTPS e não persiste tokens em localStorage/URL. Logout/revogação impede novas leituras e escritas.
- [ ] Drive/Sheets estão privados; uma conta anônima e uma conta sem acesso recebem `403`/equivalente. Não há publicação, link público ou colaborador inesperado.
- [ ] Falha de rede, retry e reexecução não duplicam eventos; quota e erro de autenticação ficam na fila local sem perder dados.
- [ ] Se houver Apps Script, testes cobrem autenticação, autorização por usuário, rate limit, payload malformado, replay e ausência de segredos.

### Local, PWA e iOS

- [ ] Extração do backup/arquivo de dados não revela o conteúdo sem o passcode/chave; WAL, temporários e exportações são incluídos no teste.
- [ ] O app funciona sem rede, sinaliza o que ainda não sincronizou e permite exportar/importar. Reinstalação e eviction têm comportamento documentado.
- [ ] O service worker não armazena respostas com PII e uma atualização remove caches antigos de forma segura.
- [ ] Permissões, consentimento, coleta em foreground/background e consumo de bateria foram testados em dispositivo iOS real; não há dependência de Web Bluetooth.

### BLE e MCP

- [ ] Testes cobrem dispositivo falso, endereço alterado, replay, duplicata, checksum inválido, valores extremos, relógio incorreto, desconexão e atualização de protocolo.
- [ ] MCP não abre porta externa, rejeita caminhos fora da allowlist, não executa comandos/SQL arbitrários, redige logs e pede confirmação para mutações.
- [ ] Dados contendo instruções maliciosas não conseguem alterar a seleção de ferramentas nem fazer o MCP enviar dados para um destino não autorizado.

### Custo e operação

- [ ] Uma execução completa (coleta, armazenamento, sync, export e consulta MCP) não depende de serviço pago, cartão ou domínio pago.
- [ ] O modo de distribuição do collector está declarado: desenvolvimento/sideload local, ou App Store/TestFlight com custo Apple explicitamente aceito. O requisito “zero” não pode ocultar essa dependência.
- [ ] Quotas atuais e limites de tamanho/frequência do GitHub/Google/Apple estão registrados no projeto, com alerta local ou teste periódico; o design continua seguro quando a sincronização é recusada.
- [ ] Existe uma rota de recuperação sem fornecedor: exportação local legível/criptografada e instruções para migrar dados sem perder o histórico.

## Decisão de go/no-go

**Go condicionado** somente para um usuário/piloto local depois de todos os critérios críticos (PII no Pages, ACL do Google, proteção do SQLite, OAuth, BLE inválido/replay e isolamento MCP) passarem.  
**No-go** se qualquer dado pessoal for publicado no GitHub Pages, se houver endpoint Google anônimo com acesso aos dados, se o SQLite/backup estiver em claro, se o PWA depender de BLE no iOS ou se o MCP estiver exposto fora de localhost/stdio sem autenticação forte.
