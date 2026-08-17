# Conexão do Whoop Coach

```text
Pages / Desktop
        ↓ HTTPS + autenticação
Ponte privada no Alienware
        ↓ localhost
Ollama: whoop-coach:0.1
        ↓
SQLite + Body Model + memória
```

O Pages nunca deve chamar `http://localhost:11434` diretamente. A porta do
Ollama não possui a camada de autenticação necessária para ficar exposta.

## PC

```powershell
python apps/local-agent/whoop-local.py serve-coach --host 127.0.0.1 --port 8765
```

O desktop inicia essa ponte automaticamente. Ela responde:

```text
GET  /health
POST /chat
```

## Pages

O build usa a variável `VITE_WHOOP_CHAT_URL`, injetada pelo GitHub Actions a
partir da variável de repositório `WHOOP_CHAT_URL`.

Para acesso somente no mesmo PC, o desenvolvimento local pode usar:

```text
http://127.0.0.1:8765/chat
```

Para o Pages funcionar fora do Alienware, é necessário um endereço HTTPS
privado, preferencialmente Tailscale. Nesse modo, configurar no Alienware:

```powershell
$env:WHOOP_GOOGLE_CLIENT_ID = "seu-client-id"
$env:WHOOP_COACH_ALLOWED_ORIGINS = "https://silvathiagoferreira.github.io"
```

A ponte valida o token Google recebido pelo browser antes de consultar o
Ollama. Não publicar a porta 11434, não colocar token fixo no frontend e não
usar um proxy público sem autenticação.

## Propriedade dos dados

O SQLite, RAW, memória, modelos estatísticos e pesos do Ollama permanecem no
Alienware. O Pages recebe somente respostas e snapshots autorizados. A fonte
de verdade não migra para GitHub Pages nem para o Google Drive.
