const { app, BrowserWindow, ipcMain, shell, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "../..");
const localAgentScript = app.isPackaged
  ? path.join(process.resourcesPath, "local-agent", "whoop-local.py")
  : path.join(projectRoot, "apps", "local-agent", "whoop-local.py");
const schemaPath = app.isPackaged
  ? path.join(
      process.resourcesPath,
      "packages",
      "database",
      "src",
      "schema.sql",
    )
  : path.join(projectRoot, "packages", "database", "src", "schema.sql");
const installedProjectRoot = path.join(
  app.getPath("documents"),
  "PROJETOS PROGRAMAÇÃO",
  "CEO",
  "Whoop",
  "projects",
  "whoop-mg-platform",
);
const dataRoot =
  app.isPackaged && fs.existsSync(installedProjectRoot)
    ? installedProjectRoot
    : app.getPath("userData");
const accountPath = path.join(app.getPath("userData"), "account.secure");
const onlineDashboard =
  "https://silvathiagoferreira.github.io/whoop-mg-platform/";
let agentProcess;
let googleAuthServer;
let desktopConnectServer;
const desktopConnectOrigins = new Set([
  "https://silvathiagoferreira.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function readAccount() {
  try {
    if (!fs.existsSync(accountPath)) return null;
    const stored = JSON.parse(fs.readFileSync(accountPath, "utf8"));
    const encoded = stored.encrypted
      ? safeStorage.decryptString(Buffer.from(stored.encrypted, "base64"))
      : stored.payload;
    return encoded ? JSON.parse(encoded) : null;
  } catch {
    return null;
  }
}

function writeAccount(account) {
  fs.mkdirSync(path.dirname(accountPath), { recursive: true });
  const payload = JSON.stringify(account);
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(
      accountPath,
      JSON.stringify({
        encrypted: safeStorage.encryptString(payload).toString("base64"),
      }),
    );
  } else {
    fs.writeFileSync(accountPath, JSON.stringify({ payload }));
  }
}

function publicAccount(account) {
  if (!account) return null;
  return {
    email: account.email,
    name: account.name,
    googleSub: account.googleSub || null,
    provider: account.provider,
    hasPassword: Boolean(account.passwordHash),
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

function sameHash(password, account) {
  if (!account?.passwordHash || !account.passwordSalt) return false;
  const candidate = crypto.scryptSync(password, account.passwordSalt, 64);
  const expected = Buffer.from(account.passwordHash, "hex");
  return (
    expected.length === candidate.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

function validateCredentials(email, password) {
  if (!/^\S+@\S+\.\S+$/.test(String(email || "")))
    throw new Error("EMAIL_INVALID");
  if (typeof password !== "string" || password.length < 8)
    throw new Error("PASSWORD_TOO_SHORT");
}

function startGoogleLogin() {
  if (googleAuthServer) throw new Error("GOOGLE_LOGIN_IN_PROGRESS");
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (googleAuthServer) googleAuthServer.close();
      googleAuthServer = null;
      if (error) reject(error);
      else resolve(value);
    };
    googleAuthServer = http.createServer((request, response) => {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }
      if (
        request.method !== "POST" ||
        !request.url?.startsWith("/oauth/callback")
      ) {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end("<p>Login recebido. Você pode voltar ao WHOOP Coach.</p>");
        return;
      }
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        try {
          const payload = JSON.parse(body);
          if (!payload.accessToken) throw new Error("GOOGLE_TOKEN_MISSING");
          response.writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          response.end("OK");
          finish(null, payload.accessToken);
        } catch (error) {
          response.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          response.end("Invalid login");
          finish(error);
        }
      });
    });
    googleAuthServer.listen(0, "127.0.0.1", () => {
      const port = googleAuthServer.address().port;
      const callback = `http://127.0.0.1:${port}/oauth/callback`;
      const url = `${onlineDashboard}?desktopAuth=1&desktopCallback=${encodeURIComponent(callback)}&v=${Date.now()}`;
      shell.openExternal(url).catch((error) => finish(error));
    });
    timeout = setTimeout(
      () => finish(new Error("GOOGLE_LOGIN_TIMEOUT")),
      5 * 60 * 1000,
    );
    googleAuthServer.on("error", (error) => finish(error));
  });
}

async function resolveGoogleAccount(accessToken) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error("GOOGLE_ACCOUNT_INVALID");
  const user = await response.json();
  const existing = readAccount();
  if (existing && existing.email !== user.email)
    throw new Error("ACCOUNT_MISMATCH");
  const account = {
    email: String(user.email || "").toLowerCase(),
    name: user.name || String(user.email || "").split("@")[0] || "Athlete",
    googleSub: user.sub,
    provider: "google",
    passwordHash: existing?.passwordHash,
    passwordSalt: existing?.passwordSalt,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeAccount(account);
  return publicAccount(account);
}

function startDesktopConnectServer() {
  desktopConnectServer = http.createServer((request, response) => {
    const origin = request.headers.origin || "";
    if (desktopConnectOrigins.has(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
    }
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (request.headers["access-control-request-private-network"] === "true") {
      response.setHeader("Access-Control-Allow-Private-Network", "true");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(
        origin && !desktopConnectOrigins.has(origin) ? 403 : 204,
      );
      response.end();
      return;
    }
    if (origin && !desktopConnectOrigins.has(origin)) {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "ORIGIN_NOT_ALLOWED" }));
      return;
    }
    if (request.method !== "POST" || request.url !== "/connect") {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "NOT_FOUND" }));
      return;
    }
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) request.destroy();
    });
    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const account = await resolveGoogleAccount(
          String(payload.accessToken || ""),
        );
        const window = BrowserWindow.getAllWindows()[0];
        window?.webContents.send("account-connected", account);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, account }));
      } catch (error) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : "CONNECT_FAILED",
          }),
        );
      }
    });
  });
  desktopConnectServer.on("error", (error) =>
    console.error("Desktop connection server failed:", error),
  );
  desktopConnectServer.listen(8766, "127.0.0.1");
}

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
  agentProcess.on("error", (error) =>
    console.error("Local agent failed:", error),
  );
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
    shell.openExternal(onlineDashboard),
  );
  ipcMain.handle("account-state", () => publicAccount(readAccount()));
  ipcMain.handle("local-sign-in", (_event, payload = {}) => {
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();
    const password = String(payload.password || "");
    const existing = readAccount();
    if (!existing) {
      if (!payload.create) throw new Error("ACCOUNT_NOT_FOUND");
      validateCredentials(email, password);
      const hashed = hashPassword(password);
      const account = {
        email,
        name: email.split("@")[0] || "Athlete",
        provider: "local",
        ...hashed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeAccount(account);
      return publicAccount(account);
    }
    if (existing.email !== email || !sameHash(password, existing))
      throw new Error("CREDENTIALS_INVALID");
    return publicAccount(existing);
  });
  ipcMain.handle("set-password", (_event, payload = {}) => {
    const account = readAccount();
    const password = String(payload.password || "");
    validateCredentials(account?.email, password);
    if (
      account?.passwordHash &&
      !sameHash(String(payload.currentPassword || ""), account)
    )
      throw new Error("CURRENT_PASSWORD_INVALID");
    const hashed = hashPassword(password);
    const next = { ...account, ...hashed, updatedAt: new Date().toISOString() };
    writeAccount(next);
    return publicAccount(next);
  });
  ipcMain.handle("google-sign-in", async () =>
    resolveGoogleAccount(await startGoogleLogin()),
  );
  startDesktopConnectServer();
  startLocalAgent();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (agentProcess && !agentProcess.killed) agentProcess.kill();
  if (desktopConnectServer) desktopConnectServer.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
