# Environment Audit

Auditoria executada em 2026-08-17 no computador local, sem inferências.

## Hardware

| Item | Resultado observado |
|---|---|
| Fabricante/modelo | Alienware m15 R6 |
| Memória | 63.80 GB reportados pelo Windows |
| GPU | NVIDIA GeForce RTX 3060 Laptop GPU |
| VRAM | 6144 MiB reportados por `nvidia-smi` |
| Driver | 581.95 |
| Resolução atual | 1920×1080 a 165 Hz |
| Bluetooth | Intel(R) Wireless Bluetooth(R), dispositivo OK |
| WHOOP | não confirmada nesta auditoria |

## Toolchain

| Ferramenta | Resultado |
|---|---|
| Python | 3.14.3 |
| Node.js | v24.17.0 |
| npm | 11.11.1 |
| pnpm | não instalado |
| Git | 2.55.0.windows.4 |
| GitHub CLI | instalado |
| Rust/Cargo | 1.94.1 |
| Docker | instalado; daemon não validado |
| WSL | instalado; distribuição não validada |
| Ollama | cliente 0.22.0, servidor parado, nenhum modelo confirmado |
| CUDA toolkit | `nvcc` não encontrado |
| SQLite | disponível pelo Python |

## Projeto

- Repositório Git: `projects/whoop-mg-platform`, branch `main`.
- Alterações locais existentes foram preservadas.
- `NoopApp-noop-7898090` não possui Git próprio nesta cópia e foi mantido como referência.
- O ZIP `NOOP v8.2.1 source code.zip` não foi alterado.

## Conclusões

1. A máquina suporta SQLite, analytics interpretável e um LLM quantizado pequeno; escolha do modelo exige benchmark real.
2. A RTX 3060 tem 6 GB de VRAM; Ollama precisa ser iniciado e comparado com fallback CPU.
3. O adaptador Bluetooth está presente, mas isso não comprova que a WHOOP MG esteja pareada ou anunciando.
4. Próximo teste físico: `python apps/local-agent/whoop-local.py scan --timeout 12`.

Após a implementação do P0, `doctor` confirmou que `bleak` está instalado. O
scan real de 8 segundos encontrou anúncios BLE, mas nenhum foi identificado como
WHOOP MG; nenhum endereço foi persistido como dispositivo confiável.
