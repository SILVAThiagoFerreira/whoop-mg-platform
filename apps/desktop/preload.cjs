const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("whoopDesktop", {
  openOnlineDashboard: () => ipcRenderer.invoke("open-online-dashboard"),
});
