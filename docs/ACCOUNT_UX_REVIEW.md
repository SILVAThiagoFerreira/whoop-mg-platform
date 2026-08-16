# Revisão independente de UX de conta e login

**Escopo:** PWA privado de saúde: telas de conta/login, estados de carregamento e erro, logout, ausência de dados antes da autenticação, consentimento e honestidade das mensagens.

**Data:** 2026-08-16  
**Base observada:** `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`, `apps/web/src/styles.css`, `apps/web/vite.config.ts`, `docs/SECURITY.md`, `docs/STATUS.md` e `docs/ARCHITECTURE_REVIEW.md`.

## Veredito

O checkout não implementa conta, login, sessão, consentimento, logout ou acesso a dados pessoais. O que existe é um dashboard público de demonstração: `App` renderiza diretamente, os valores são marcados como `DEMO DATA`, e `SYNC NOW` alterna um estado local por 1,6 s sem autenticar, conectar ou salvar dados. Isso é coerente com a publicação de um shell estático, mas ainda não é uma UX de PWA privado.

**Recomendação:** manter o modo demo explicitamente separado e, antes de conectar dados reais, introduzir uma barreira de autenticação que garanta que nenhum dado do usuário seja renderizado, cacheado ou solicitado enquanto a sessão não estiver confirmada. Não usar o atual dashboard como fallback de uma sessão ambígua.

## Evidências do estado atual

| Área | Observação | Risco/impacto de UX |
| --- | --- | --- |
| Entrada | Não há rota ou tela de login; o dashboard abre direto. | Em um produto privado, o usuário não sabe se está em modo pessoal, demo ou sessão anterior. |
| Dados pré-login | Há números, gráfico e cards no primeiro render. O texto os marca como `DEMO DATA`, `derived mock`, `mock session` ou `not WHOOP score`. | Seguro somente enquanto forem fixtures públicas. Um futuro provider real não pode reutilizar esse caminho sem um gate de sessão. |
| Conta | Não há identidade, email, avatar, escopos, conta conectada ou seletor de usuário. | Não existe contexto para saber de quem são os dados nem para trocar de conta. |
| Sincronização | `SYNC NOW` apenas mostra `Sync in progress` e depois `Collector offline`; não há erro real, retry, cancelamento ou resultado persistido. | A linguagem atual não deve ser reaproveitada para uma operação autenticada sem estados verificáveis. |
| Logout/revogação | Ausentes. | Não há forma de encerrar acesso, revogar autorização ou confirmar limpeza da sessão. |
| Testes | O teste cobre apenas a presença de `DEMO DATA` e “Not available yet”. | Faltam testes de isolamento pré-login, expiração, logout, consentimento e falhas. |

## Fluxo recomendado

### 1. Tela pública / modo demo

Deve declarar no primeiro viewport: “Modo demonstração — nenhum dado pessoal é carregado”. A ação de entrar deve ser distinta de “ver demonstração”. O demo pode mostrar apenas fixtures estáticas e não deve pedir permissões de saúde, Drive, Bluetooth ou localização.

Mensagem honesta sugerida:

> Você está vendo dados de demonstração. Entre para acessar seus dados autorizados. Este app não é um produto WHOOP oficial e não fornece diagnóstico.

### 2. Login

Mostrar o provedor e a finalidade antes do redirecionamento. Se houver OAuth, explicar em linguagem curta quais dados serão acessados, por quê, onde serão armazenados e como desconectar. Não revelar se um email existe em respostas de erro de conta.

Controles mínimos:

- botão com estado acessível (`Entrando…`) e prevenção de duplo envio;
- link para voltar ao demo sem criar sessão;
- link para política de privacidade e termos, visíveis antes do consentimento;
- indicação de que o login não equivale a autorização para coletar sensores ou sincronizar dados.

### 3. Retorno do provedor / verificação

Usar uma tela transitória (“Verificando sua sessão…”) sem renderizar métricas. Validar `state`, expiração e escopos no retorno; remover códigos e tokens da URL antes de qualquer navegação ou telemetria. Em caso de falha, oferecer “Tentar novamente” e “Voltar ao modo demonstração”, sem mostrar dados privados.

### 4. Primeiro acesso e consentimento

Separar consentimentos por finalidade, sem caixa pré-marcada:

1. acesso à conta e dados necessários ao funcionamento;
2. leitura/importação de dados do dispositivo ou fonte externa;
3. sincronização em armazenamento privado escolhido pelo usuário;
4. comunicações opcionais, se existirem.

Cada item deve indicar fonte, tipos de dados, finalidade, destino, retenção, possibilidade de revogação e efeito de recusar. “Continuar” só deve liberar a função correspondente; recusar sensores não deve apagar a conta nem bloquear o uso de dados já importados, salvo dependência explicitada.

### 5. Área autenticada vazia

Depois de sessão válida, mas sem dados, usar estado vazio: “Ainda não há dados importados”. Explicar o próximo passo e a origem esperada. Não preencher com números demo silenciosamente, nem chamar ausência de dados de “offline” ou “normal”.

### 6. Sessão ativa

Exibir identidade mínima (por exemplo, email parcialmente mascarado), fonte e estado da sessão em “Conta/Privacidade”. A área de métricas deve mostrar proveniência (`RAW`, `MEASURED`, `DERIVED`, `ESTIMATED`, `MOCK` ou `UNKNOWN`) e data da última sincronização real. A origem deve distinguir claramente dado do usuário de fixture demo.

## Estados obrigatórios

| Estado | Comportamento esperado | Mensagem/ação |
| --- | --- | --- |
| Inicial desconhecido | Bloquear dados privados até resolver a sessão. | “Verificando sua sessão…”; não usar `null` como autenticado. |
| Não autenticado | Mostrar login e, opcionalmente, demo isolado. | “Entre para acessar seus dados”; “Ver demonstração” separado. |
| Entrando | Desabilitar o botão e preservar contexto. | “Abrindo login seguro…”; permitir recuperação se o retorno não chegar. |
| Consentimento pendente | Não buscar dados antes da escolha. | Resumo de finalidade, fonte, destino e revogação. |
| Autenticado sem dados | Mostrar estado vazio, não fixtures. | “Ainda não há dados importados”; ação de configurar/importar. |
| Carregando dados | Reservar layout e indicar o escopo. | “Carregando seus dados autorizados…”; nunca exibir valores antigos como se fossem atuais. |
| Falha de rede | Preservar cache local permitido e declarar sua idade. | “Não foi possível atualizar. Última atualização: [data]. Tentar novamente.” |
| Sessão expirada/revogada | Remover acesso aos dados protegidos e pedir novo login. | “Sua sessão terminou. Entre novamente para continuar.” Não culpar o usuário. |
| Sem permissão | Explicar o escopo faltante e oferecer reautorizar ou seguir sem a função. | “O acesso a [fonte] não foi concedido”; não prometer sincronização. |
| Logout em andamento | Desabilitar ações e concluir limpeza verificável. | “Saindo…”; revogar/desassociar conforme a escolha explícita. |
| Logout concluído | Voltar ao estado não autenticado sem dados privados. | “Você saiu. Seus dados não são exibidos neste dispositivo.” Informar o que foi mantido/apagado. |
| Erro inesperado | Não expor tokens, payloads, emails completos ou stack trace. | ID técnico redigido + “Tentar novamente” e suporte/diagnóstico local. |

Falhas de login, logout, refresh, importação e sincronização precisam de retry idempotente, feedback não apenas visual e estado persistente de “pendente” quando aplicável. Um spinner sozinho não informa segurança nem resultado.

## Logout, troca de conta e revogação

Em “Conta” devem existir ações distintas:

- **Sair deste dispositivo:** encerra a sessão e remove credenciais web; confirmar se dados locais, fila e cache serão mantidos ou apagados.
- **Desconectar fonte:** revoga a autorização/importação daquela fonte e interrompe novas leituras; informar que cópias já exportadas podem continuar existindo.
- **Excluir dados locais/conta:** ação destrutiva separada, com resumo do que será removido, confirmação explícita e resultado verificável.
- **Trocar conta:** sair e limpar o contexto ativo antes de iniciar outro login; nunca misturar dados entre contas.

Após logout, testar botão voltar, abas duplicadas, service worker, IndexedDB/OPFS, cache, URLs de callback e exportações pendentes. Nenhuma dessas rotas deve reabrir métricas privadas sem nova sessão válida.

## Ausência de dados antes da autenticação

O contrato de UX deve ser: `session === unknown` e `session === unauthenticated` não podem executar provider de saúde, consulta de Drive/Sheets, leitura de banco, cálculo de métricas ou hidratação de cache pessoal. O service worker deve cachear somente o shell público; respostas privadas devem exigir política de cache explícita e isolamento por usuário.

O bundle pode conter fixtures demo, mas elas devem ser identificáveis por tipo e nunca parecerem um histórico real. A UI deve evitar frases como “seu Recovery é 79” no modo demo. Preferir “Exemplo de Recovery: 79” e repetir o rótulo no gráfico, tooltip, título da página e acessibilidade.

## Consentimento e mensagens honestas

- Não chamar o produto de “WHOOP”, “oficial”, “médico”, “clínico” ou “diagnóstico”. “Não é oficial” precisa ficar próximo de login e das métricas, não somente escondido em documentação.
- Não prometer “sincronização concluída” quando apenas uma requisição começou; mostrar fonte, horário, quantidade e resultado real.
- “Offline”, “sem dados”, “sem permissão” e “erro de rede” são estados diferentes e devem ter ações diferentes.
- Informar que a coleta depende do collector/hardware e que métricas equivalentes a WHOOP permanecem `UNKNOWN` ou experimentais enquanto não houver evidência reproduzível.
- Consentimento deve ser revogável e granular; registrar versão e data do texto aceito sem armazenar mais PII que o necessário.
- Evitar dark patterns: não esconder recusa, não forçar aceite de comunicação opcional e não usar urgência para dados de saúde.

## Achados priorizados

### P0 — bloqueador para dados reais

1. Implementar gate de sessão com estado `unknown/loading`, `unauthenticated` e `authenticated`; provar que o caminho não autenticado não renderiza nem solicita dados privados.
2. Separar completamente demo público de dados autenticados, incluindo providers, cache, rotas e títulos/mensagens.
3. Definir logout, expiração/revogação e troca de conta com limpeza e testes de abas, back button e service worker.
4. Obter consentimento informado e granular antes de cada fonte/finalidade; não tratar login como consentimento de saúde.

### P1 — necessário para piloto privado

1. Implementar estados de erro, retry, cancelamento e sessão expirada com mensagens acionáveis e redigidas.
2. Criar tela de Conta/Privacidade com identidade mínima, fontes autorizadas, escopos, retenção, exportação e exclusão.
3. Mostrar proveniência, frescor e status real em cada dado; reservar `MOCK` para demo.
4. Testar acessibilidade dos estados (foco, leitor de tela, `aria-live`, contraste, teclado e botão desabilitado).

### P2 — acabamento

1. Testar instalação/reinstalação, múltiplas abas, modo avião, relógio incorreto e atualização do PWA.
2. Padronizar vocabulário de autenticação, autorização, sincronização e revogação em PT-BR e inglês, se houver suporte multilíngue.

## Critérios de aceite verificáveis

- [ ] Usuário anônimo abre o PWA sem métricas pessoais, tokens, identificadores ou chamadas a fontes privadas.
- [ ] O modo demo é explicitamente rotulado em cards, gráfico, navegação e título; nenhuma fixture é atribuída ao usuário.
- [ ] Login, retorno OAuth, expiração, erro, retry e cancelamento têm estados testados e não deixam segredo na URL/log/cache.
- [ ] Consentimentos aparecem antes da finalidade correspondente, são granulares, não pré-marcados e podem ser revogados.
- [ ] Usuário autenticado sem dados vê estado vazio; não há fallback silencioso para demo.
- [ ] Logout remove a sessão ativa, impede novas leituras/escritas e não revela dados ao usar voltar, recarregar ou outra aba.
- [ ] Troca de conta não mistura dados, caches, filas ou identificadores entre usuários.
- [ ] Falhas distinguem rede, sessão expirada, permissão recusada, fonte indisponível e ausência de dados.
- [ ] Cada métrica informa origem, classificação de dado, horário/frescor e limitações; não há alegação de equivalência WHOOP sem evidência.
- [ ] Testes automatizados cobrem pelo menos os estados acima e uma inspeção manual cobre PWA instalado, offline e revogação.

## Conclusão

O snapshot atual é aceitável como demo pública porque declara o caráter mock e não implementa acesso pessoal. Ele não atende ainda aos requisitos de conta/login de um PWA privado. A próxima entrega deve priorizar o isolamento pré-autenticação e o ciclo completo de sessão/consentimento/logout; somente depois faz sentido conectar fontes reais ou prometer sincronização.
