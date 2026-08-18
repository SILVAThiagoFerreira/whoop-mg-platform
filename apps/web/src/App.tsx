import { useEffect, useMemo, useState } from "react";
import { useGoogleAuth } from "./auth/useGoogleAuth";
import {
  createOrVerifyLocalAccount,
  currentLocalAccount,
  localAccountError,
  rememberGoogleAccount,
} from "./auth/localAccount";
import {
  isBackendConfigured,
  readAccountSnapshot,
  type AccountMetric,
  type AccountSnapshot,
} from "./data/accountStore";
import {
  askWhoopCoach,
  isCoachConfigured,
  type CoachMessage,
} from "./data/coachStore";

type View = "Today" | "Recovery" | "Strain" | "Sleep" | "Coach" | "More";
type ScoreTone = "recovery" | "sleep" | "strain";
type MetricDefinition = {
  label: string;
  key: string;
  unit?: string;
  tone: "recovery" | "sleep" | "strain" | "neutral";
  emptyNote?: string;
};

const navigation: View[] = [
  "Today",
  "Recovery",
  "Strain",
  "Sleep",
  "Coach",
  "More",
];

const definitions: MetricDefinition[] = [
  { label: "Heart rate variability", key: "hrv", unit: "ms", tone: "recovery" },
  { label: "Resting heart rate", key: "rhr", unit: "bpm", tone: "recovery" },
  { label: "Heart rate", key: "heart_rate", unit: "bpm", tone: "strain" },
  { label: "Sleep duration", key: "sleep_duration", unit: "h", tone: "sleep" },
  {
    label: "Respiratory rate",
    key: "respiratory_rate",
    unit: "rpm",
    tone: "sleep",
    emptyNote: "Not available yet",
  },
  {
    label: "Skin temperature",
    key: "skin_temperature",
    unit: "°C",
    tone: "neutral",
    emptyNote: "Not available yet",
  },
  {
    label: "Blood oxygen",
    key: "spo2",
    unit: "%",
    tone: "neutral",
    emptyNote: "Not available yet",
  },
  {
    label: "Battery",
    key: "battery",
    unit: "%",
    tone: "neutral",
    emptyNote: "Local engine not connected",
  },
];

type AppUser = NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;

const pageCopy: Record<
  Exclude<View, "Coach" | "More">,
  { eyebrow: string; title: string; description: string }
> = {
  Today: {
    eyebrow: "YOUR DAY",
    title: "Today at a glance",
    description: "A calm read on how your body is doing right now.",
  },
  Recovery: {
    eyebrow: "RECOVERY",
    title: "Know when to push",
    description:
      "Your readiness is built from the signals your body gives you.",
  },
  Strain: {
    eyebrow: "STRAIN",
    title: "Understand your load",
    description: "See how much work your body has taken on today.",
  },
  Sleep: {
    eyebrow: "SLEEP",
    title: "Build better nights",
    description: "Sleep is the foundation for everything you do tomorrow.",
  },
};

function ScoreRing({
  value,
  tone,
  label,
}: {
  value?: string;
  tone: ScoreTone;
  label: string;
}) {
  const numeric = value ? Number.parseFloat(value) : Number.NaN;
  const max = tone === "strain" ? 21 : 100;
  const progress = Number.isFinite(numeric)
    ? Math.min(1, Math.max(0, numeric / max))
    : 0;
  const radius = 51;
  const circumference = 2 * Math.PI * radius;
  const recoveryBand =
    tone === "recovery"
      ? !Number.isFinite(numeric) || numeric >= 67
        ? "high"
        : numeric >= 34
          ? "medium"
          : "low"
      : "";

  return (
    <div
      className={`score-ring ${tone} ${recoveryBand}`}
      aria-label={`${label}: ${value ?? "No data"}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="ring-copy">
        <strong>{value ?? "—"}</strong>
        <span>{tone === "strain" ? "/ 21" : "%"}</span>
      </div>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand-mark ${compact ? "compact" : ""}`}
      aria-label="WHOOP MG Lab"
    >
      <span className="brand-puck" aria-hidden="true" />
      <span className="whoop-wordmark">
        WHOOP <small>MG</small>
      </span>
    </div>
  );
}

function NavIcon({ item }: { item: View }) {
  return (
    <span className={`nav-icon nav-${item.toLowerCase()}`} aria-hidden="true" />
  );
}

function AccountGate({
  configured,
  status,
  error,
  onSignIn,
  onLocalSignIn,
}: {
  configured: boolean;
  status: string;
  error: string | null;
  onSignIn: () => void;
  onLocalSignIn: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const localMode = !configured;
  const formError = localError ?? error;

  return (
    <div className={`account-gate ${localMode ? "local-mode" : "google-mode"}`}>
      <div className="gate-layout">
        <section className="account-card">
          <div className="account-brand">
            <BrandMark compact />
          </div>
          <h2>Sign In</h2>
          <span className="sr-only">Train smarter.</span>
          <span className="sr-only">Private by design</span>
          <div className="auth-mode" role="status">
            <span className="auth-mode-dot" aria-hidden="true" />
            <span>ACCOUNT ACCESS</span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setLocalError(null);
              const normalizedEmail = email.trim().toLowerCase();
              const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail,
              );
              if (!validEmail || password.trim().length < 4) {
                setLocalError(
                  "Digite o email e a senha de uma conta existente.",
                );
                return;
              }
              setSubmitting(true);
              void onLocalSignIn(normalizedEmail, password)
                .catch((error: unknown) =>
                  setLocalError(localAccountError(error)),
                )
                .finally(() => setSubmitting(false));
            }}
          >
            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(formError)}
              />
            </label>
            <label className="auth-field password-field">
              <span>Password</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(formError)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? "◉" : "◌"}
              </button>
            </label>
            <button
              className="forgot-link"
              type="button"
              onClick={() =>
                setLocalError(
                  "Se sua conta usa Google, selecione CONTINUE WITH GOOGLE. A recuperação de acesso é feita pelo provedor da conta.",
                )
              }
            >
              Problemas para entrar?
            </button>
            {formError && (
              <div className="error-message" role="alert">
                {formError}
              </div>
            )}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? "CHECKING…" : "SIGN IN"}
            </button>
          </form>
          {configured && (
            <button
              className="google-button"
              type="button"
              onClick={onSignIn}
              disabled={status === "loading"}
            >
              {status === "loading" ? "CONNECTING…" : "CONTINUE WITH GOOGLE"}
            </button>
          )}
          {localMode && (
            <div className="setup-warning">
              <strong>Google sign-in is off in this local build</strong>
              <p>
                Configure <code>VITE_GOOGLE_CLIENT_ID</code> for account access.
              </p>
            </div>
          )}
          <p className="account-disclaimer">
            Acesso somente para contas provisionadas. Nenhuma senha Google é
            recebida por este formulário.
          </p>
        </section>
      </div>
      <p className="account-footer">
        WHOOP MG Lab · acesso autenticado · dados locais ou serviço privado
      </p>
    </div>
  );
}

function MetricCard({
  definition,
  metric,
}: {
  definition: MetricDefinition;
  metric?: AccountMetric;
}) {
  return (
    <article className={`metric-card ${definition.tone}`}>
      <div className="metric-topline">
        <span className="metric-label">{definition.label}</span>
        <span className="metric-dot" aria-hidden="true" />
      </div>
      <div className="metric-value">
        {metric?.value ?? "—"}
        <small>{metric?.unit ?? definition.unit}</small>
      </div>
      <div className="metric-note">
        {metric
          ? `${metric.sourceType ?? "SOURCE UNKNOWN"}${metric.source ? ` · ${metric.source}` : ""}`
          : (definition.emptyNote ?? "Waiting for data")}
      </div>
    </article>
  );
}

function ScoreCard({
  label,
  value,
  tone,
  title,
  description,
  footer,
  focused,
  onOpen,
}: {
  label: string;
  value?: string;
  tone: ScoreTone;
  title: string;
  description: string;
  footer: [string, string, string, string];
  focused?: boolean;
  onOpen?: () => void;
}) {
  return (
    <article className={`score-card ${tone}-card ${focused ? "focused" : ""}`}>
      <div className="score-card-header">
        <span>{label}</span>
        <button
          className="quiet-icon"
          onClick={onOpen}
          aria-label={`Open ${label} details`}
        >
          ↗
        </button>
      </div>
      <div className="score-body">
        <ScoreRing value={value} tone={tone} label={label} />
        <div className="score-copy">
          <strong className="score-title">{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <div className="score-card-footer">
        <span>{footer[0]}</span>
        <b>{footer[1]}</b>
        <span>{footer[2]}</span>
        <b>{footer[3]}</b>
      </div>
    </article>
  );
}

function CoachPanel({
  user,
  token,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;
  token: string;
  onLogout: () => void;
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: "assistant",
      content:
        "Olá. Eu sou o Whoop Coach. Quando seus dados estiverem conectados, poderei interpretar seu histórico pessoal com evidências.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isCoachConfigured();

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setSending(true);
    try {
      const result = await askWhoopCoach(token, user, content, messages);
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "UNKNOWN";
      if (code === "AUTH_EXPIRED") onLogout();
      else
        setError(
          code === "COACH_API_NOT_CONFIGURED"
            ? "O Whoop Coach ainda não está conectado a este Pages."
            : "Não foi possível falar com o Whoop Coach.",
        );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="coach-panel" aria-label="Whoop Coach">
      <div className="coach-panel-header">
        <div>
          <div className="card-kicker">PRIVATE LOCAL ASSISTANT</div>
          <h2>Whoop Coach</h2>
          <p>
            Uma leitura contextual do seu histórico, sem transformar uma métrica
            em diagnóstico.
          </p>
        </div>
        <span className={`coach-status ${configured ? "online" : "offline"}`}>
          <i /> {configured ? "BRIDGE READY" : "NOT CONNECTED"}
        </span>
      </div>
      <div className="coach-prompts">
        <span>Try asking</span>
        <button
          onClick={() =>
            setInput("Como devo equilibrar recuperação e treino hoje?")
          }
        >
          Recovery vs. training
        </button>
        <button
          onClick={() => setInput("O que mudou no meu sono esta semana?")}
        >
          Sleep this week
        </button>
      </div>
      <div className="coach-messages">
        {messages.map((message, index) => (
          <div
            className={`coach-message ${message.role}`}
            key={`${message.role}-${index}`}
          >
            <span>{message.role === "assistant" ? "WHOOP COACH" : "VOCÊ"}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {sending && (
          <div className="coach-typing">
            Whoop Coach está analisando localmente…
          </div>
        )}
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="coach-composer">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={
            configured
              ? "Pergunte como seu corpo está…"
              : "Configure a ponte local para conversar…"
          }
          disabled={!configured || sending}
          rows={2}
        />
        <button
          onClick={() => void send()}
          disabled={!configured || sending || !input.trim()}
        >
          {sending ? "…" : "Enviar"}
        </button>
      </div>
      <small className="coach-footnote">
        O modelo não recebe acesso direto ao Google Drive nem ao sistema
        operacional.
      </small>
    </section>
  );
}

function TrendCard({ hasData }: { hasData: boolean }) {
  return (
    <section className="trend-card">
      <div className="section-heading">
        <div>
          <div className="card-kicker">TRENDS</div>
          <h2>Understand your patterns</h2>
        </div>
        <span>30 DAYS</span>
      </div>
      <div className="trend-visual" aria-hidden="true">
        {[22, 38, 31, 50, 45, 67, 56, 78, 70, 82, 68, 88].map(
          (height, index) => (
            <i key={index} style={{ height: `${hasData ? height : 10}%` }} />
          ),
        )}
      </div>
      <div className="trend-empty">
        <strong>
          {hasData ? "Trend engine ready" : "Your trends start here"}
        </strong>
        <p>
          {hasData
            ? "More history will make your patterns clearer."
            : "The local engine will build a personal baseline as you wear your device."}
        </p>
      </div>
    </section>
  );
}

function MoreView({
  user,
  token,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;
  token: string;
  onLogout: () => void;
}) {
  const account = currentLocalAccount();
  const [desktopState, setDesktopState] = useState<
    "idle" | "connecting" | "connected" | "unavailable"
  >("idle");
  const [desktopMessage, setDesktopMessage] = useState<string | null>(null);

  async function connectDesktop() {
    if (token.startsWith("local-token:")) {
      setDesktopState("unavailable");
      setDesktopMessage("Entre com Google para conectar este navegador ao PC.");
      return;
    }
    setDesktopState("connecting");
    setDesktopMessage(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch("http://127.0.0.1:8766/connect", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ accessToken: token }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !body.ok)
        throw new Error(body.error ?? "CONNECT_FAILED");
      setDesktopState("connected");
      setDesktopMessage(
        "Software conectado. A janela do PC deve abrir sua sessão.",
      );
    } catch (error) {
      setDesktopState("unavailable");
      const message = error instanceof Error ? error.message : "";
      setDesktopMessage(
        message === "The user aborted a request."
          ? "O navegador bloqueou a rede local. Use ABRIR DESKTOP LOGIN para concluir no aplicativo."
          : "Não foi possível conectar. Verifique se o Whoop Coach está aberto e tente novamente.",
      );
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function openDesktopLogin() {
    setDesktopState("connecting");
    setDesktopMessage("Abrindo o Whoop Coach neste computador…");
    window.location.href = "whoopcoach://connect";
  }

  return (
    <section className="more-view">
      <div className="page-heading">
        <div className="card-kicker">SETTINGS</div>
        <h1>More</h1>
        <p>
          Make the platform work around your training, your data and your
          privacy.
        </p>
      </div>
      <div className="settings-grid">
        <article className="settings-card profile-card">
          <span className="settings-icon">◎</span>
          <div>
            <div className="card-kicker">ACCOUNT</div>
            <h2>{user.name ?? user.email}</h2>
            <p>
              {account?.provider === "google"
                ? "Conectado com Google. A identidade e a recuperação de acesso são gerenciadas pelo Google."
                : "Conta local provisionada para esta instalação."}
            </p>
          </div>
        </article>
        <article className="settings-card">
          <span className="settings-icon">⌑</span>
          <div>
            <div className="card-kicker">ACCOUNT SECURITY</div>
            <h2>Google account security</h2>
            <p>
              Esta aplicação não cria, armazena ou altera a senha Google. Use o
              gerenciamento oficial da sua Conta Google para atualizar a senha
              ou recuperar o acesso.
            </p>
            <a
              className="account-google-link"
              href="https://myaccount.google.com/signinoptions/password"
              target="_blank"
              rel="noreferrer"
            >
              Gerenciar senha da Conta Google ↗
            </a>
          </div>
        </article>
        <article className="settings-card desktop-connect-card">
          <span className="settings-icon">↔</span>
          <div>
            <div className="card-kicker">DESKTOP CONNECTION</div>
            <h2>Connect this account to the PC</h2>
            <p>
              O software Whoop Coach precisa estar aberto neste computador. A
              conexão é local e usa a sessão Google atual; nenhum token é salvo
              no site.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => void connectDesktop()}
              disabled={
                desktopState === "connecting" || desktopState === "connected"
              }
            >
              {desktopState === "connecting"
                ? "CONNECTING…"
                : desktopState === "connected"
                  ? "CONNECTED"
                  : "CONNECT TO PC"}
            </button>
            {desktopState === "unavailable" && (
              <button
                className="secondary-button"
                type="button"
                onClick={openDesktopLogin}
              >
                ABRIR DESKTOP LOGIN
              </button>
            )}
            {desktopMessage && (
              <span
                className={`setting-status desktop-connect-status ${desktopState}`}
                role="status"
              >
                <i /> {desktopMessage}
              </span>
            )}
          </div>
        </article>
        <article className="settings-card">
          <span className="settings-icon">⌁</span>
          <div>
            <div className="card-kicker">DEVICE</div>
            <h2>WHOOP MG</h2>
            <p>
              Local collector status is shown on the dashboard before any sync
              is considered valid.
            </p>
            <span className="setting-status">
              <i />{" "}
              {isBackendConfigured()
                ? "Private service connected"
                : "Local engine not connected"}
            </span>
          </div>
        </article>
        <article className="settings-card">
          <span className="settings-icon">⌾</span>
          <div>
            <div className="card-kicker">PRIVACY</div>
            <h2>Data stays private</h2>
            <p>
              Drive and Sheets are not exposed to this interface. Measured,
              derived and estimated values remain distinct.
            </p>
          </div>
        </article>
        <article className="settings-card">
          <span className="settings-icon">?</span>
          <div>
            <div className="card-kicker">SUPPORT</div>
            <h2>Built for serious training</h2>
            <p>
              Olympic-level use requires real sensor validation, personal
              baselines and human performance oversight.
            </p>
          </div>
        </article>
      </div>
      <button className="signout-secondary" onClick={onLogout}>
        Sign out <span>↗</span>
      </button>
    </section>
  );
}

function Sidebar({
  view,
  onChange,
  user,
  onLogout,
}: {
  view: View;
  onChange: (view: View) => void;
  user: NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <BrandMark />
      <div className="sidebar-section-label">YOUR PERFORMANCE</div>
      <nav aria-label="Main navigation" className="side-nav">
        {navigation.map((item) => (
          <button
            key={item}
            className={view === item ? "active" : ""}
            onClick={() => onChange(item)}
          >
            <NavIcon item={item} />
            <span>{item}</span>
            {view === item && <i />}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-device">
          <span className="device-puck" />
          <div>
            <strong>WHOOP MG</strong>
            <span>
              <i /> Local mode
            </span>
          </div>
          <b>⌁</b>
        </div>
        <div className="sidebar-user">
          <span className="avatar">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.name ?? user.email}</strong>
            <span>Personal account</span>
          </div>
          <button aria-label="Sign out" onClick={onLogout}>
            ↗
          </button>
        </div>
      </div>
    </aside>
  );
}

function Dashboard({
  user,
  token,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;
  token: string;
  onLogout: () => void;
}) {
  const [view, setView] = useState<View>("Today");
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      setSnapshot(await readAccountSnapshot(token, user));
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar os dados desta conta.";
      if (message === "AUTH_EXPIRED") onLogout();
      else setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const metricMap = useMemo(
    () =>
      new Map(
        (snapshot?.metrics ?? []).map((metric) => [
          metric.metric.toLowerCase(),
          metric,
        ]),
      ),
    [snapshot],
  );
  const recovery = metricMap.get("recovery")?.value;
  const sleepPerformance =
    metricMap.get("sleep_performance")?.value ?? metricMap.get("sleep")?.value;
  const sleepDuration = metricMap.get("sleep_duration")?.value;
  const strain = metricMap.get("strain")?.value;
  const firstName = (user.name ?? user.email).split(" ")[0];
  const storageLabel =
    snapshot?.storage === "server" ? "Private service" : "Local mode";
  const statusLabel = snapshot?.dataAvailable
    ? "All systems ready"
    : (snapshot?.message ?? "Waiting for your first sync");
  const activePage =
    view === "Coach" || view === "More" ? null : pageCopy[view];
  const visibleDefinitions =
    view === "Recovery"
      ? definitions.filter((item) =>
          ["hrv", "rhr", "spo2", "skin_temperature"].includes(item.key),
        )
      : view === "Sleep"
        ? definitions.filter((item) =>
            ["sleep_duration", "respiratory_rate", "skin_temperature"].includes(
              item.key,
            ),
          )
        : view === "Strain"
          ? definitions.filter((item) =>
              ["strain", "heart_rate", "battery"].includes(item.key),
            )
          : definitions;

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} user={user} onLogout={onLogout} />
      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand">
            <BrandMark compact />
          </div>
          <div className="topbar-date">
            {new Date()
              .toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })
              .toUpperCase()}
          </div>
          <div className="topbar-actions">
            <div className="system-status">
              <span className="status-dot" />{" "}
              {loading
                ? "LOADING"
                : snapshot?.dataAvailable
                  ? "DATA AVAILABLE"
                  : "NO DATA"}
            </div>
            <button
              className="topbar-sync"
              onClick={() => void refresh()}
              disabled={loading || refreshing}
            >
              {refreshing ? "SYNCING…" : "SYNC"}
            </button>
            <span className="mobile-avatar avatar">
              {(user.name ?? user.email).slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main>
          {view === "More" ? (
            <MoreView user={user} token={token} onLogout={onLogout} />
          ) : view === "Coach" ? (
            <>
              <div className="page-heading">
                <div className="card-kicker">
                  PRIVATE PERFORMANCE INTELLIGENCE
                </div>
                <h1>Talk to your body.</h1>
                <p>Ask better questions. Make better decisions.</p>
              </div>
              <CoachPanel user={user} token={token} onLogout={onLogout} />
            </>
          ) : (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">{activePage?.eyebrow}</div>
                  <h1>
                    {view === "Today"
                      ? `Good morning, ${firstName}`
                      : activePage?.title}
                  </h1>
                  <p>
                    {view === "Today"
                      ? "Here&apos;s how your body is doing today."
                      : activePage?.description}
                  </p>
                </div>
                <div className="welcome-meta">
                  <span className="today-chip">
                    TODAY <b>—</b>
                  </span>
                  <span className="status-copy">
                    {snapshot?.dataAvailable
                      ? `Source: ${storageLabel}`
                      : "No readings for this account"}
                  </span>
                </div>
              </section>
              <section className="score-grid" aria-label="Today's scores">
                <ScoreCard
                  label="RECOVERY"
                  onOpen={() => setView("Recovery")}
                  value={recovery}
                  tone="recovery"
                  focused={view === "Recovery"}
                  title={recovery ? "Score available" : "No score yet"}
                  description={
                    recovery
                      ? "Your body is primed for the day."
                      : "Connect the local engine to start your baseline."
                  }
                  footer={[
                    "HRV",
                    `${metricMap.get("hrv")?.value ?? "—"} ms`,
                    "RHR",
                    `${metricMap.get("rhr")?.value ?? "—"} bpm`,
                  ]}
                />
                <ScoreCard
                  label="SLEEP"
                  onOpen={() => setView("Sleep")}
                  value={sleepPerformance}
                  tone="sleep"
                  focused={view === "Sleep"}
                  title={sleepPerformance ? "Score available" : "No sleep data"}
                  description={
                    sleepPerformance
                      ? "Last value received from the data source."
                      : "No sleep value has been received."
                  }
                  footer={[
                    "LAST NIGHT",
                    sleepDuration ? `${sleepDuration} h` : "—",
                    "STATUS",
                    sleepPerformance ? "RECEIVED" : "WAITING",
                  ]}
                />
                <ScoreCard
                  label="STRAIN"
                  onOpen={() => setView("Strain")}
                  value={strain}
                  tone="strain"
                  focused={view === "Strain"}
                  title={strain ? "Score available" : "No strain yet"}
                  description={
                    strain
                      ? "Last value received from the data source."
                      : "No strain value has been received."
                  }
                  footer={[
                    "HEART RATE",
                    `${metricMap.get("heart_rate")?.value ?? "—"} bpm`,
                    "SOURCE",
                    strain ? "RECEIVED" : "WAITING",
                  ]}
                />
              </section>
              <section className="sync-bar">
                <div className="sync-icon">⌁</div>
                <div>
                  <strong>{statusLabel}</strong>
                  <p>
                    {storageLabel} · data is scoped to this signed-in account
                  </p>
                </div>
                <button
                  onClick={() => void refresh()}
                  disabled={loading || refreshing}
                >
                  {refreshing ? "UPDATING…" : "UPDATE VIEW"}
                </button>
              </section>
              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}
              <section className="section-heading">
                <div>
                  <div className="card-kicker">HEALTH MONITOR</div>
                  <h2>{activePage?.title}</h2>
                </div>
                <span>
                  {snapshot?.dataAvailable
                    ? "Measured and derived data"
                    : "No data yet"}
                </span>
              </section>
              {loading ? (
                <section className="empty-state">
                  <div className="loading-dots">•••</div>
                  <h3>Preparing your dashboard</h3>
                  <p>
                    Nothing is displayed until this signed-in account is ready.
                  </p>
                </section>
              ) : (
                <section className="metrics-grid">
                  {visibleDefinitions.map((definition) => (
                    <MetricCard
                      key={definition.key}
                      definition={definition}
                      metric={metricMap.get(definition.key)}
                    />
                  ))}
                </section>
              )}
              <section className="data-note">
                <strong>Historical trends are unavailable</strong>
                <p>
                  This account currently exposes the latest snapshot only. No
                  chart is shown until a real time-series source is connected.
                </p>
              </section>
              <div className="privacy-note">
                <span>⌾</span>
                <div>
                  <strong>Data stays private</strong>
                  <p>
                    Google Drive and Google Sheets are not exposed to this user
                    interface. Storage is handled by the local engine or
                    authenticated private service.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              <NavIcon item={item} />
              {item}
            </button>
          ))}
        </nav>
        {!isBackendConfigured() && (
          <div className="local-badge">"LOCAL MODE · NO DATA SERVICE"</div>
        )}
      </div>
    </div>
  );
}

export function App() {
  const auth = useGoogleAuth();
  const [localUser, setLocalUser] = useState<AppUser | null>(null);
  useEffect(() => {
    if (auth.user) void rememberGoogleAccount(auth.user);
  }, [auth.user]);

  const leaveLocalSession = () => {
    setLocalUser(null);
  };
  if (localUser)
    return (
      <Dashboard
        user={localUser}
        token={`local-token:${localUser.sub}`}
        onLogout={leaveLocalSession}
      />
    );
  if (auth.status !== "signed_in" || !auth.user || !auth.accessToken)
    return (
      <AccountGate
        configured={auth.configured}
        status={auth.status}
        error={auth.error}
        onSignIn={() => void auth.signIn()}
        onLocalSignIn={async (email, password) => {
          const account = await createOrVerifyLocalAccount(
            email,
            password,
            false,
          );
          setLocalUser({
            sub: account.googleSub ?? `local-${email}`,
            name: account.name,
            email: account.email,
            picture: "",
          });
        }}
      />
    );
  return (
    <Dashboard
      user={auth.user}
      token={auth.accessToken}
      onLogout={auth.signOut}
    />
  );
}
