# Setup ainda necessário

O código do Whoop Coach e do desktop está implementado. Para o botão de chat
do GitHub Pages conversar com o Alienware fora do próprio PC, ainda falta uma
camada de rede privada.

## Para habilitar o chat online

1. Instalar e autenticar uma VPN privada, preferencialmente Tailscale, no
   Alienware e no dispositivo que abrirá o Pages.
2. Publicar somente a ponte local `127.0.0.1:8765` através de HTTPS privado.
3. Configurar no Alienware `WHOOP_GOOGLE_CLIENT_ID` e
   `WHOOP_COACH_ALLOWED_ORIGINS`.
4. Criar a variável de repositório `WHOOP_CHAT_URL` apontando para o endpoint
   privado terminado em `/chat`.
5. Fazer novo deploy do Pages.

Não publicar a porta `11434` do Ollama e não colocar token fixo no frontend.
Enquanto esse setup não existir, o desktop local funciona e o chat do Pages
mostra `NOT CONNECTED` de forma explícita.
