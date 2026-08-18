const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("whoopDesktop", {
  openOnlineDashboard: () => ipcRenderer.invoke("open-online-dashboard"),
  getAccount: () => ipcRenderer.invoke("account-state"),
  signInLocal: (email, password, create = false) =>
    ipcRenderer.invoke("local-sign-in", { email, password, create }),
  setPassword: (password, currentPassword = "") =>
    ipcRenderer.invoke("set-password", { password, currentPassword }),
  signInGoogle: () => ipcRenderer.invoke("google-sign-in"),
  onAccountConnected: (callback) => {
    const listener = (_event, account) => callback(account);
    ipcRenderer.on("account-connected", listener);
    return () => ipcRenderer.removeListener("account-connected", listener);
  },
  onAccountConnectError: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("account-connect-error", listener);
    return () => ipcRenderer.removeListener("account-connect-error", listener);
  },
});
