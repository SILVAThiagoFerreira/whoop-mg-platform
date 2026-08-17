const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "../..");
const localAgentScript = app.isPackaged
  ? path.join(process.resourcesPath, "local-agent", "whoop-local.py")
  : path.join(projectRoot, "apps", "local-agent", "whoop-local.py");
const schemaPath = app.isPackaged
  ? path.join(process.resourcesPath, "packages", "database", "src", "schema.sql")
  : path.join(projectRoot, "packages", "database", "src", "schema.sql");
const installedProjectRoot = path.join(
  app.getPath("documents"),
  "PROJETOS PROGRAMAÇÃO",
  "CEO",
  "Whoop",
  "projects",
  "whoop-mg-platform",
);
const dataRoot = app.isPackaged && fs.existsSync(installedProjectRoot) ? installedProjectRoot : app.getPath("userData");
let agentProcess;

function startLocalAgent() {
  const python = process.env.WHOOP_PYTHON || "python";
  agentProcess = spawn(
    python,
    [localAgentScript, "serve-coach", "--host", "127.0.0.1", "--port", "8765"],
    {
      cwd: app.isPackaged ? process.resourcesPath : projectRoot,
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        WHOOP_SCHEMA_PATH: schemaPath,
        WHOOP_DATABASE_PATH: path.join(dataRoot, "data", "whoop.db"),
        WHOOP_RAW_DIR: path.join(dataRoot, "data", "raw"),
        WHOOP_LOG_DIR: path.join(dataRoot, "logs"),
      },
    },
  );
  agentProcess.on("error", (error) => console.error("Local agent failed:", error));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#121518",
    title: "Whoop Coach",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  window.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("open-online-dashboard", () =>
    shell.openExternal("https://silvathiagoferreira.github.io/whoop-mg-platform/"),
  );
  startLocalAgent();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (agentProcess && !agentProcess.killed) agentProcess.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
