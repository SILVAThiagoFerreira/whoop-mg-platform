# Whoop Coach Desktop

Aplicativo desktop local para Windows. Ele inicia a ponte local, conversa com
o Ollama e usa o banco do agente no Alienware. O botão do dashboard online abre
o Pages, que deve usar uma ponte privada configurada separadamente.

## Início rápido

Na raiz do projeto, use `INICIAR-WHOOP-COACH.bat`. Ele abre o instalador
empacotado quando disponível ou inicia a versão de desenvolvimento.

## Desenvolvimento

```powershell
cd apps/desktop
npm install
npm start
```

## Empacotamento

```powershell
npm run dist
```

O desktop não copia dados fisiológicos para o frontend web. A fonte de verdade
continua no SQLite do PC; o online recebe apenas respostas/snapshots autorizados.

O desktop usa o mesmo `data/whoop.db` do projeto oficial quando essa pasta
existe em Documentos. Assim, a coleta local, o processamento e a conversa
consultam a mesma memória.
