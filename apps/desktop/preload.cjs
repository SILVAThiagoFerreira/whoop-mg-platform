const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("whoopDesktop", {
  openOnlineDashboard: () => ipcRenderer.invoke("open-online-dashboard"),
  getAccount: () => ipcRenderer.invoke("account-state"),
  signInLocal: (email, password, create = false) => ipcRenderer.invoke("local-sign-in", { email, password, create }),
  setPassword: (password, currentPassword = "") => ipcRenderer.invoke("set-password", { password, currentPassword }),
  signInGoogle: () => ipcRenderer.invoke("google-sign-in"),
});
