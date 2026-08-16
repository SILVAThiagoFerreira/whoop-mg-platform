# WHOOP App Master

Mapa de funcionalidades públicas e decisão de replicabilidade para o WHOOP MG Lab. “Replicar” significa oferecer uma experiência/análise útil; não significa copiar o algoritmo proprietário, a interface ou uma função clínica.

| Feature                 | Tela/propósito                  | Input provável                    | WHOOP 5 | MG             | API oficial      | BLE local                               | Podemos replicar                    | Status       |
| ----------------------- | ------------------------------- | --------------------------------- | ------- | -------------- | ---------------- | --------------------------------------- | ----------------------------------- | ------------ |
| Recovery                | prontidão diária                | sono, HRV, RHR, SpO2, temperatura | oficial | oficial/varia  | possível via API | UNKNOWN                                 | índice próprio explicável           | DERIVED      |
| Sleep                   | duração, estágios, consistência | PPG, movimento, eventos           | oficial | oficial/varia  | possível via API | UNKNOWN                                 | fluxo e análise; não score igual    | PARTIAL      |
| Strain                  | carga diária/atividade          | FC, movimento, duração            | oficial | oficial/varia  | possível via API | UNKNOWN                                 | zonas/carga próprias                | DERIVED      |
| Stress Monitor          | stress em tempo real            | FC/HRV/contexto                   | oficial | oficial/varia  | possível via API | UNKNOWN                                 | baseline/anomalias próprias         | EXPERIMENTAL |
| HRV / RHR               | sinais de baseline              | RR/FC                             | oficial | possível       | possível via API | UNKNOWN                                 | agregação transparente              | EXPERIMENTAL |
| Live HR                 | leitura ao vivo                 | característica BLE                | oficial | possível       | não necessário   | UNKNOWN; NOOP declara 5/MG experimental | collector local quando validado     | EXPERIMENTAL |
| Workouts                | sessão, zonas, carga            | FC, movimento, edição manual      | oficial | oficial/varia  | possível via API | UNKNOWN                                 | importar/manual + analytics         | PARTIAL      |
| Health Monitor          | painel de métricas              | múltiplos sensores                | oficial | possível       | possível via API | UNKNOWN                                 | painel de origem explícita          | EXPERIMENTAL |
| Trends                  | tendências e comparações        | agregados próprios                | oficial | não específico | possível via API | local                                   | sim, com banco local                | PLANNED      |
| Journal                 | contexto e hábitos              | entrada manual                    | oficial | possível       | possível via API | não aplicável                           | sim, local-first                    | PLANNED      |
| Healthspan / Coach      | insights e recomendações        | histórico + modelos               | oficial | possível       | possível via API | não aplicável                           | insights próprios, sem equivalência | PLANNED      |
| Battery/device          | status do hardware              | device info/BLE                   | oficial | possível       | não necessário   | UNKNOWN                                 | sim após descoberta                 | EXPERIMENTAL |
| ECG / IHRN              | funções MG sensíveis            | sinal específico e validação      | UNKNOWN | EXPERIMENTAL   | UNKNOWN          | UNKNOWN                                 | não prometer; pesquisar             | BLOCKED      |
| Blood Pressure Insights | função de saúde                 | modelo/conta/função oficial       | UNKNOWN | EXPERIMENTAL   | UNKNOWN          | UNKNOWN                                 | não reproduzir sem evidência        | BLOCKED      |

## Regras de aceite

- `OFFICIAL` descreve o comportamento documentado pela WHOOP, não uma licença para copiá-lo.
- `MEASURED` exige captura real identificada; `DERIVED` e `ESTIMATED` devem mostrar fórmula, versão, inputs e limitações.
- Recursos ECG, IHRN e pressão não serão apresentados como disponíveis sem confirmação técnica e avaliação regulatória apropriada.
- A API oficial é opcional: o sistema principal deve continuar útil com SQLite/collector local.

## Fontes

- [WHOOP Developer API](https://developer.whoop.com/)
- [WHOOP Support](https://support.whoop.com/)
- [NOOP](https://github.com/ryanbr/noop)
- [OpenStrap research](https://github.com/OpenStrap/research)
- [Totem](https://github.com/thebriangao/totem)

Consultado em 2026-08-16. A matriz BLE 5.0/MG permanece experimental/UNKNOWN até teste no dispositivo alvo.
