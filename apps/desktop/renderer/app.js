const api = "http://127.0.0.1:8765";
const loginScreen = document.querySelector("#login-screen");
const appShell = document.querySelector("#app-shell");
const loginForm = document.querySelector("#local-login");
const loginError = document.querySelector("#login-error");
const messages = document.querySelector("#messages");
const form = document.querySelector("#composer");
const input = document.querySelector("#input");
const send = document.querySelector("#send");
const status = document.querySelector("#status");
const history = [];

const pageNames = {
  dashboard: "OVERVIEW",
  recovery: "RECOVERY",
  strain: "STRAIN",
  sleep: "SLEEP",
  coach: "COACH",
  more: "MORE",
};

const todayDate = document.querySelector("#today-date");
if (todayDate) {
  todayDate.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("whoop-local-session") || "null");
  } catch {
    return null;
  }
}

function saveSession(email) {
  try {
    localStorage.setItem(
      "whoop-local-session",
      JSON.stringify({ email, name: email.split("@")[0] || "member" }),
    );
  } catch {
    /* current-window session still works */
  }
}

function updateProfile(session) {
  const name = session?.name || "member";
  const displayName = name
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  setText("#profile-name", displayName.toUpperCase());
  setText("#profile-initial", displayName.charAt(0).toUpperCase() || "W");
}

function showApp(session) {
  loginScreen.hidden = true;
  appShell.classList.remove("app-hidden");
  updateProfile(session);
  checkHealth();
}

function showLogin() {
  appShell.classList.add("app-hidden");
  loginScreen.hidden = false;
  loginForm?.reset();
  if (loginError) loginError.textContent = "";
}

function addMessage(role, content) {
  if (!messages) return;
  const article = document.createElement("article");
  article.className = `message ${role}`;
  const label = document.createElement("label");
  label.textContent = role === "assistant" ? "WHOOP COACH" : "YOU";
  const paragraph = document.createElement("p");
  paragraph.textContent = content;
  article.append(label, paragraph);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
}

function showView(view) {
  const nextView = pageNames[view] ? view : "dashboard";
  document
    .querySelectorAll(".nav-item")
    .forEach((item) =>
      item.classList.toggle("active", item.dataset.view === nextView),
    );
  document
    .querySelectorAll(".view")
    .forEach((section) =>
      section.classList.toggle(
        "active-view",
        section.id === `${nextView}-view`,
      ),
    );
  const accountPanel = document.querySelector("#account-panel");
  if (accountPanel) accountPanel.hidden = nextView !== "more";
  setText("#page-label", pageNames[nextView]);
}

async function getJson(path, options = {}) {
  const response = await fetch(`${api}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "LOCAL_SERVICE_UNAVAILABLE");
  return body;
}

function metricRow(snapshot, name) {
  return (snapshot.latest_metrics || []).find((item) => {
    const metric = String(item.metric || "").toLowerCase();
    return metric === name || metric.includes(name);
  });
}

function metricValue(snapshot, name) {
  const row = metricRow(snapshot, name);
  return row ? `${row.value}${row.unit ? ` ${row.unit}` : ""}` : "—";
}

function numericValue(value) {
  const number = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function updateScore(
  name,
  value,
  detailSelector,
  captionSelector,
  progressSelector,
  max,
) {
  const number = numericValue(value);
  setText(`#dash-${name}`, value);
  setText(detailSelector, value);
  setText(
    captionSelector,
    number === null ? "No data yet" : "Updated from local memory",
  );
  const bar = document.querySelector(progressSelector);
  if (bar)
    bar.style.width =
      number === null
        ? "0%"
        : `${Math.min(100, Math.max(0, (number / max) * 100))}%`;
}

async function checkHealth() {
  if (!status) return;
  try {
    const body = await getJson("/health");
    status.classList.add("ready");
    setText("#status span", "LOCAL READY");
    setText("#model-name", body.model || "whoop-coach:0.1");
    setText(
      "#observation-count",
      Number(body.observation_count || 0).toLocaleString("en-US"),
    );
    setText(
      "#chat-subtitle",
      `${body.observation_count || 0} observations · local memory`,
    );
    const deviceLive = document.querySelector(".device-live");
    if (body.device_count > 0) {
      setText(
        "#sidebar-device",
        `${body.device_count} DEVICE${body.device_count === 1 ? "" : "S"}`,
      );
      setText("#sidebar-device-detail", "Registered locally");
      deviceLive?.classList.add("ready");
    }
    await loadDashboard();
  } catch {
    status.classList.remove("ready");
    setText("#status span", "OFFLINE");
    setText("#dashboard-updated", "Local agent offline");
  }
}

async function loadDashboard() {
  try {
    const snapshot = await getJson("/dashboard");
    const recovery = metricValue(snapshot, "recovery");
    const strain = metricValue(snapshot, "strain");
    const sleep = metricValue(snapshot, "sleep");
    updateScore(
      "recovery",
      recovery,
      "#recovery-detail-score",
      "#recovery-caption",
      ".recovery-card .score-progress i",
      100,
    );
    updateScore(
      "strain",
      strain,
      "#strain-detail-score",
      "#strain-caption",
      ".strain-card .score-progress i",
      21,
    );
    updateScore(
      "sleep",
      sleep,
      "#sleep-detail-score",
      "#sleep-caption",
      ".sleep-card .score-progress i",
      100,
    );
    setText("#dash-hrv", metricValue(snapshot, "hrv"));
    setText("#dash-rhr", metricValue(snapshot, "rhr"));
    setText(
      "#sync-google",
      snapshot.google_sync_configured ? "ready" : "not configured",
    );
    setText(
      "#sync-ble",
      snapshot.ble_offload_status === "ready" ? "ready" : "not implemented",
    );
    setText("#sync-last", snapshot.last_sync?.ended_at || "none");
    setText(
      "#dashboard-updated",
      snapshot.last_sync?.ended_at
        ? `Last sync ${snapshot.last_sync.ended_at}`
        : `${snapshot.observation_count || 0} local observations`,
    );
    const hasScores = [recovery, strain, sleep].some((value) => value !== "—");
    setText(
      "#dashboard-title",
      hasScores ? "Data available" : "No current readings",
    );
    setText(
      "#dashboard-note",
      hasScores
        ? "Latest values received by the local agent."
        : "Connect a device or run a local sync to load recovery, strain, and sleep values.",
    );
  } catch {
    setText("#dashboard-updated", "Waiting for local sync");
  }
}

async function askCoach(content) {
  addMessage("user", content);
  history.push({ role: "user", content });
  if (send) {
    send.disabled = true;
    send.innerHTML = "Thinking <span>…</span>";
  }
  try {
    const body = await getJson("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, history }),
    });
    addMessage("assistant", body.reply);
    history.push({ role: "assistant", content: body.reply });
  } catch (error) {
    addMessage("assistant", `I couldn't answer right now: ${error.message}`);
  } finally {
    if (send) {
      send.disabled = false;
      send.innerHTML = "Send <span>↑</span>";
    }
    checkHealth();
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#login-email")?.value.trim();
  const password = document.querySelector("#login-password")?.value;
  const create = false;
  if (!email || !password) {
    if (loginError)
      loginError.textContent = "Enter your email and password to continue.";
    return;
  }
  if (loginError) loginError.textContent = "Checking account…";
  try {
    const account = await window.whoopDesktop.signInLocal(
      email,
      password,
      create,
    );
    if (document.querySelector("#remember-me")?.checked)
      saveSession(account.email);
    else localStorage.removeItem("whoop-local-session");
    if (loginError) loginError.textContent = "";
    showApp(account);
  } catch (error) {
    if (loginError)
      loginError.textContent =
        error.message === "ACCOUNT_NOT_FOUND"
          ? "No local account exists yet. Use Google or create a local account from the web app first."
          : "The email or password is incorrect.";
  }
});

document
  .querySelector("#google-login")
  ?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.innerHTML = '<span class="google-g">G</span> Waiting for Google…';
    if (loginError)
      loginError.textContent =
        "Complete Google sign-in in your browser. This window will update automatically.";
    try {
      const account = await window.whoopDesktop.signInGoogle();
      saveSession(account.email);
      if (loginError) loginError.textContent = "";
      showApp(account);
    } catch (error) {
      if (loginError)
        loginError.textContent =
          error.message === "GOOGLE_LOGIN_TIMEOUT"
            ? "Google sign-in timed out. Try again."
            : "Google sign-in could not be completed.";
    } finally {
      button.disabled = false;
      button.innerHTML =
        '<span class="google-g">G</span> Continue with Google <span>↗</span>';
    }
  });

document
  .querySelector("#toggle-password")
  ?.addEventListener("click", (event) => {
    const password = document.querySelector("#login-password");
    if (!password) return;
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    event.currentTarget.textContent = visible ? "◉" : "◌";
    event.currentTarget.setAttribute(
      "aria-label",
      visible ? "Show password" : "Hide password",
    );
  });

document.querySelector("#forgot-password")?.addEventListener("click", () => {
  if (loginError)
    loginError.textContent =
      "Use Continue with Google or recover the account with your identity provider.";
});
document
  .querySelectorAll("[data-view]")
  .forEach((item) =>
    item.addEventListener("click", () => showView(item.dataset.view)),
  );
document
  .querySelectorAll(".go-coach")
  .forEach((button) =>
    button.addEventListener("click", () => showView("coach")),
  );

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = input?.value.trim();
  if (!content || send?.disabled) return;
  input.value = "";
  await askCoach(content);
});

document.querySelector("#scan")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const result = document.querySelector("#scan-result");
  const state = document.querySelector("#scan-state");
  button.disabled = true;
  button.innerHTML = "Searching… <span>⌁</span>";
  if (state) state.textContent = "SCANNING";
  if (result)
    result.textContent = "Listening for BLE broadcasts for a few seconds…";
  try {
    const body = await getJson("/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!body.devices?.length)
      result.textContent = "No device found. Keep WHOOP nearby and try again.";
    else
      result.textContent = `${body.devices.length} device(s) found: ${body.devices.map((device) => device.name || device.address).join(", ")}`;
    if (state) state.textContent = "READ ONLY";
  } catch (error) {
    if (result) result.textContent = `Search blocked: ${error.message}`;
    if (state) state.textContent = "BLOCKED";
  } finally {
    button.disabled = false;
    button.innerHTML = "Find devices <span>⌁</span>";
    checkHealth();
  }
});

document.querySelector("#online")?.addEventListener("click", () => {
  if (window.whoopDesktop?.openOnlineDashboard)
    window.whoopDesktop.openOnlineDashboard();
});
document
  .querySelector("#profile")
  ?.addEventListener("click", () => showView("more"));
document.querySelector("#backup-hint")?.addEventListener("click", () => {
  const result = document.querySelector("#sync-result");
  if (result)
    result.textContent =
      "Backups are stored in the local data/ directory before sync.";
});
document
  .querySelector("#sync-now")
  ?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const result = document.querySelector("#sync-result");
    button.disabled = true;
    button.textContent = "Syncing…";
    try {
      const body = await getJson("/sync/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      result.textContent =
        body.result?.status === "NO_CHANGES"
          ? "Your copy is already up to date."
          : "Auxiliary copy updated.";
      await loadDashboard();
    } catch (error) {
      result.textContent = `Not run: ${error.message}. Configure Google in the local agent.`;
    } finally {
      button.disabled = false;
      button.innerHTML = "Sync auxiliary copy <span>↻</span>";
    }
  });

document.querySelector("#logout")?.addEventListener("click", () => {
  try {
    localStorage.removeItem("whoop-local-session");
  } catch {
    /* ignore */
  }
  showLogin();
});

window.whoopDesktop?.onAccountConnected?.((account) => {
  saveSession(account.email);
  showApp(account);
  showView("dashboard");
});

async function bootstrapSession() {
  const initialSession = readSession();
  try {
    const account = await window.whoopDesktop?.getAccount();
    if (initialSession && account && initialSession.email === account.email)
      showApp(account);
    else showLogin();
  } catch {
    showLogin();
  }
}
void bootstrapSession();
