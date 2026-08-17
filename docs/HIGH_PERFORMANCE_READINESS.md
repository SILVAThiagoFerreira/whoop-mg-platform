# High-performance readiness

## Objetivo

Preparar o Whoop Coach para uso em treinamento de atletas de alto rendimento
sem confundir um protótipo local com um sistema clínico ou uma fórmula
proprietária de prontidão.

## Portões antes de qualquer uso com atletas

1. **Identidade e consentimento:** cada atleta precisa de um identificador,
   consentimento, escopo de uso, retenção e revogação.
2. **Isolamento:** um atleta nunca pode consultar o banco de outro. Coaches e
   equipe médica devem ter permissões separadas e auditadas.
3. **Proveniência:** cada valor precisa preservar dispositivo, firmware,
   origem, horário UTC, timezone, qualidade, confiança e importação.
4. **Qualidade:** gaps, duplicatas, clock drift, valores impossíveis e conflitos
   devem aparecer antes de qualquer recomendação.
5. **Validação:** previsões usam time-split/walk-forward e precisam mostrar
   amostra, erro, janela e limites; não existe promoção silenciosa de modelo.
6. **Revisão humana:** recomendações de carga, retorno e saúde precisam de
   revisão do profissional responsável e não podem gerar diagnóstico.
7. **Operação:** backups restauráveis, logs sem tokens, criptografia em repouso
   quando apropriado e plano de incidente.

## Fases

- **Pessoal:** uma conta, fonte local, pesquisa e validação do dispositivo.
- **Piloto:** poucos atletas convidados, isolamento e auditoria completos.
- **Competição:** somente após evidência operacional, revisão especializada e
  procedimentos de segurança documentados.

O estado atual é **Pessoal / não pronto para piloto**. Ainda não há dados
fisiológicos reais no banco e a coleta histórica BLE da WHOOP MG continua
bloqueada.

