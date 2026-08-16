# MCP local (planejado)

O servidor MCP será executado somente no host local e nunca pelo GitHub Pages. As ferramentas previstas (`whoop_device_status`, `whoop_sync`, `whoop_today`, `whoop_heart_rate`, `whoop_sleep`, `whoop_trends`, `whoop_raw`, `whoop_data_gaps`) devem ler o SQLite com controle de acesso e nunca retornar secrets. A implementação será habilitada após o collector produzir dados reais.

