# Local Setup

```powershell
cd "C:\Users\ferre\OneDrive\Documentos\PROJETOS PROGRAMAÇÃO\CEO\Whoop\projects\whoop-mg-platform"
python apps/local-agent/whoop-local.py doctor
python apps/local-agent/whoop-local.py scan --timeout 12
```

Para descoberta BLE, instale apenas no ambiente local de teste: `python -m pip install bleak`.

## Whoop Coach local

Com o Ollama ligado, inicie a ponte:

```powershell
.\scripts\start-coach.ps1
```

O endpoint local será `http://127.0.0.1:8765`. O desktop inicia essa ponte
automaticamente. O Pages precisa de uma URL HTTPS privada configurada em
`WHOOP_CHAT_URL` para conversar com o PC fora do navegador local.

Fixture e baseline:

```powershell
python apps/local-agent/whoop-local.py ingest tests/fixtures/whoop_api_sample.json --source whoop_api_recovery
python apps/local-agent/whoop-local.py baseline hrv --window 28
```
# Início do Whoop Coach

Para abrir o software desktop no Windows, dê duplo clique em:

```text
INICIAR-WHOOP-COACH.bat
```

Ou execute no PowerShell:

```powershell
.\INICIAR-WHOOP-COACH.ps1
```

O aplicativo inicia a ponte local em `127.0.0.1:8765`, conversa com o Ollama e
usa o SQLite local como fonte de verdade. O Pages é uma interface complementar;
ele não substitui o processamento do Alienware.
