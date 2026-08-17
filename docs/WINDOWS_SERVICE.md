# Windows Service

O P0 usa scripts PowerShell e não instala serviço persistente. A próxima etapa deve avaliar Task Scheduler antes de Windows Service: iniciar o agente, registrar logs, respeitar o usuário conectado e permitir parada limpa. Nenhuma tarefa agendada foi criada automaticamente.
