# Local Setup

```powershell
cd "C:\Users\ferre\OneDrive\Documentos\PROJETOS PROGRAMAÇÃO\CEO\Whoop\projects\whoop-mg-platform"
python apps/local-agent/whoop-local.py doctor
python apps/local-agent/whoop-local.py scan --timeout 12
```

Para descoberta BLE, instale apenas no ambiente local de teste: `python -m pip install bleak`.

Fixture e baseline:

```powershell
python apps/local-agent/whoop-local.py ingest tests/fixtures/whoop_api_sample.json --source whoop_api_recovery
python apps/local-agent/whoop-local.py baseline hrv --window 28
```
