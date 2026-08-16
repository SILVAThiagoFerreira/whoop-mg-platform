# Reverse engineering

| Feature            | Status       | Source                   | Packet/characteristic | 5.0     | MG      | Realtime | Historical | Decoder | Tests | Notes                        |
| ------------------ | ------------ | ------------------------ | --------------------- | ------- | ------- | -------- | ---------- | ------- | ----- | ---------------------------- |
| Device info        | RESEARCHED   | research/repositories.md | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    | validar no hardware          |
| Battery            | RESEARCHED   | research/repositories.md | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    | scaffold only                |
| Heart rate         | PARTIAL      | public projects          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    | não presumir compatibilidade |
| R-R                | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    | preservar raw                |
| PPG                | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    | sinal sensível               |
| Accelerometer      | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    |                              |
| Gyroscope          | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    |                              |
| Temperature        | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    |                              |
| SpO2               | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    |                              |
| Sleep markers      | UNKNOWN      | public research          | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    |                              |
| ECG / MG           | EXPERIMENTAL | official/public docs     | UNKNOWN               | UNKNOWN | UNKNOWN | UNKNOWN  | UNKNOWN    | no      | no    | não alegar suporte           |
| Historical offload | EXPERIMENTAL | research notes           | UNKNOWN               | UNKNOWN | UNKNOWN | no       | UNKNOWN    | no      | no    | dependente de protocolo      |

Status só pode avançar para `VALIDATED` com logs raw, teste reproduzível e hardware identificado.
