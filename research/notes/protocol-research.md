# Notas de pesquisa: protocolo BLE e histórico WHOOP

**Data da verificação:** 2026-08-16 (America/Fortaleza)

## O que parece reproduzível no WHOOP 4.0

O [OpenStrap/research README](https://github.com/OpenStrap/research) descreve um framing com byte inicial `0xAA`, comprimento, CRC-8 do campo de comprimento, payload alinhado e CRC-32 do payload; a reassemblagem deve usar o comprimento declarado, não procurar somente `0xAA`. O mesmo README atribui `0x2F` a registros históricos, `0x30` a eventos e `0x31` a marcadores de sincronização, e descreve um handshake de sync no qual o token de 8 bytes de `HistoryEnd` precisa ser ecoado para avançar o cursor. Isso é documentação de reverse engineering, não especificação oficial.

O README também afirma que o histórico não é apagado pelo sync e que a mesma banda pode ser drenada novamente. A afirmação é útil para desenho de idempotência, mas deve ser validada em hardware próprio antes de assumir comportamento universal.

O [christianmeurer/whoop-reader](https://github.com/christianmeurer/whoop-reader) oferece uma segunda referência para 4.0: serviço GATT customizado, stream de tempo real e campos conhecidos/candidatos. A própria tabela deixa bytes e sensores como não confirmados; trate offsets e significado como hipóteses versionadas.

## WHOOP 5.0/MG: estado e limites

O [NOOP README](https://github.com/ryanbr/noop) declara: WHOOP 4.0 é o caminho testado; 5.0/MG tem HR ao vivo confirmado em hardware real, enquanto recovery/strain/sleep e outros dados ainda estão sendo mapeados experimentalmente. O mesmo documento descreve um bond BLE criptografado único e falha de pareamento (“bond refused”/“Encryption is insufficient”) quando o app oficial ainda mantém o vínculo. Portanto:

- compatibilidade de HR ao vivo: **declarada/confirmada pelo projeto NOOP, confiança média**;
- histórico offload de 5.0/MG: **UNKNOWN** nesta pesquisa; não inferir a partir do 4.0;
- recuperação, strain, sono, SpO₂, temperatura e HRV completos: **UNKNOWN/incompletos**, conforme as limitações explicitamente listadas pelo NOOP;
- framing/UUIDs/handshake do 5.0/MG: **UNKNOWN** para este projeto até captura e validação em hardware/firmware alvo.

O [NOOP attribution](https://github.com/NoopApp/noop) relaciona o caminho 5.0/MG a trabalho anterior de `b-nnett/goose` e cita uma família de serviço `fd4b0001-…`, CRC16-Modbus e “puffin” packet types. Isso é uma pista de origem/compatibilidade, não prova suficiente para implementar sem validar o commit e o dispositivo específicos. O fork [tigercraft4/goose](https://github.com/tigercraft4/goose) está arquivado desde 2026-07-23.

## Riscos técnicos e operacionais

1. **Firmware/update:** OpenStrap/research recomenda não reconectar ao app oficial depois de iniciar uso do protocolo, porque um firmware update pode mudar eventos/registros. Fixar versão de firmware e coletar captures antes/depois de qualquer update.
2. **Bond e concorrência:** o bond criptográfico é descrito como de um dispositivo por vez. Testar pareamento, reconexão e retorno ao app oficial em uma unidade não crítica; não assumir que live HR implica que histórico, haptics ou comandos autenticados funcionam.
3. **Comandos destrutivos:** OpenStrap/research alerta para erase de flash, reboot e controle do LED óptico. Um cliente de produção deve permitir somente leitura/offload por padrão, bloquear opcodes perigosos e exigir confirmação explícita.
4. **Dados e privacidade:** NOOP/Goose são locais por padrão, mas Goose oferece backend opcional; Totem usa API privada, tokens e conta WHOOP. Não misturar “BLE local” com “API cloud” no mesmo trust boundary.
5. **Métricas:** bytes empiricamente correlacionados não são ground truth clínico. Scores oficiais (recovery/strain/sleep) podem ser calculados na nuvem e não estar no fio; métricas locais devem ser rotuladas como aproximações.
6. **Distribuição/licença:** OpenStrap é MIT; NOOP e Goose declaram PolyForm Noncommercial 1.0.0. API GitHub retornou `NOASSERTION` para estes últimos; revisar o texto da licença no commit exato antes de reutilizar qualquer implementação. Totem é MIT declarado, mas não resolve risco da API privada.
7. **Legal/comercial:** todos os projetos são não oficiais. Licença do código não autoriza uso de firmware, marca, dados de terceiros, contorno de termos ou distribuição de binários de terceiros. Fazer revisão jurídica específica para o país e o produto.

## Recomendação para este projeto

Implementar a arquitetura em camadas: transporte BLE, framing por versão, decoder com campos `confirmed`/`candidate`/`unknown`, armazenamento de raw frames e uma máquina de sync idempotente. Começar apenas com o perfil 4.0 cuja evidência de offload é maior. Manter WHOOP 5.0/MG atrás de feature flag experimental, exigir identificação explícita de modelo/firmware e registrar captures/telemetria local para validação. Não copiar código; usar as referências apenas para hipóteses testáveis e atribuição.

## URLs consultadas

- https://github.com/OpenStrap/research — consultado 2026-08-16; confiança alta no escopo, média nos campos empíricos.
- https://github.com/OpenStrap/edge — consultado 2026-08-16; confiança alta no limite “4.0 only”.
- https://github.com/ryanbr/noop — consultado 2026-08-16; confiança alta nas declarações do projeto, média para 5.0/MG experimental.
- https://github.com/tigercraft4/goose — consultado 2026-08-16; confiança alta no arquivamento, média nas capacidades históricas declaradas.
- https://github.com/NoopApp/noop — consultado 2026-08-16; confiança média como fonte de atribuição histórica.
- https://github.com/thebriangao/totem — consultado 2026-08-16; confiança alta de que é API privada/MCP, não BLE.
- https://github.com/christianmeurer/whoop-reader — consultado 2026-08-16; confiança média-alta como referência independente de 4.0.
