import { useEffect, useMemo, useState } from "react";
import { useGoogleAuth } from "./auth/useGoogleAuth";
import {
  createOrVerifyLocalAccount,
  currentLocalAccount,
  localAccountError,
  rememberGoogleAccount,
  setLocalPassword,
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

const demoUser = {
  sub: "demo-athlete",
  name: "Demo Athlete",
  email: "athlete@whoop-mg.local",
  picture: "",
};
type AppUser = NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;

const demoSnapshot: AccountSnapshot = {
  metrics: [
    {
      metric: "recovery",
      value: "78",
      unit: "%",
      sourceType: "DERIVED",
      source: "demo baseline",
    },
    {
      metric: "hrv",
      value: "62",
      unit: "ms",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
    {
      metric: "rhr",
      value: "51",
      unit: "bpm",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
    {
      metric: "sleep_performance",
      value: "86",
      unit: "%",
      sourceType: "DERIVED",
      source: "demo baseline",
    },
    {
      metric: "sleep_duration",
      value: "8.1",
      unit: "h",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
    {
      metric: "strain",
      value: "11.7",
      unit: "score",
      sourceType: "DERIVED",
      source: "demo baseline",
    },
    {
      metric: "heart_rate",
      value: "142",
      unit: "bpm",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
    {
      metric: "respiratory_rate",
      value: "15.8",
      unit: "rpm",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
    {
      metric: "spo2",
      value: "97.2",
      unit: "%",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
    {
      metric: "battery",
      value: "84",
      unit: "%",
      sourceType: "MEASURED",
      source: "demo sensor",
    },
  ],
  lastSync: new Date().toISOString(),
  collectorStatus: "online",
  dataAvailable: true,
  storage: "local",
  message:
    "Demo data loaded locally. Connect a real source before using it for training decisions.",
};

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
  onDemo,
}: {
  configured: boolean;
  status: string;
  error: string | null;
  onSignIn: () => void;
  onLocalSignIn: (
    email: string,
    password: string,
    create: boolean,
  ) => Promise<void>;
  onDemo: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
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
            <span>LOCAL SIGN-IN READY</span>
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
                  "Digite um email válido e uma senha. Para contas novas, use pelo menos 8 caracteres.",
                );
                return;
              }
              setSubmitting(true);
              void onLocalSignIn(normalizedEmail, password, createAccount)
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
                  "Para contas Google, use o Google. Depois de entrar, crie ou altere a senha local em More → Account Security.",
                )
              }
            >
              {createAccount ? "Use uma conta existente" : "Forgot Password?"}
            </button>
            {formError && (
              <div className="error-message" role="alert">
                {formError}
              </div>
            )}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting
                ? "CHECKING…"
                : createAccount
                  ? "CREATE ACCOUNT"
                  : "SIGN IN"}
            </button>
          </form>
          <button
            type="button"
            className="account-mode-link"
            onClick={() => {
              setCreateAccount((value) => !value);
              setLocalError(null);
            }}
          >
            {createAccount
              ? "Já tenho uma conta local"
              : "Criar uma senha local"}
          </button>
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
          <div className="demo-entry">
            <div>
              <span className="demo-kicker">NO ACCOUNT NEEDED</span>
              <p>Explore the WHOOP MG experience with sample data.</p>
            </div>
            <button className="demo-button" type="button" onClick={onDemo}>
              EXPLORE DEMO <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="account-disclaimer">
            Private by design · no Drive or Sheets permission is requested.
          </p>
        </section>
        <section className="gate-visual-side" aria-label="Performance preview">
          <div className="visual-puck">◒</div>
          <div className="visual-copy">
            <span>WHOOP MG LAB</span>
            <strong>
              Unlock your
              <br />
              <em>human performance.</em>
            </strong>
          </div>
          <div className="visual-bands">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="visual-caption">
            <span>01 — RECOVERY</span>
            <span>02 — SLEEP</span>
            <span>03 — STRAIN</span>
          </div>
        </section>
      </div>
      <p className="account-footer">
        Unofficial WHOOP-compatible analytics · local engine powered
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
  onLogout,
  onSetPassword,
}: {
  user: NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;
  onLogout: () => void;
  onSetPassword: (password: string, currentPassword?: string) => Promise<void>;
}) {
  const account = currentLocalAccount();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação da senha não confere.");
      return;
    }
    setSavingPassword(true);
    try {
      await onSetPassword(newPassword, currentPassword || undefined);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Senha local atualizada nesta instalação.");
    } catch (error) {
      setPasswordError(localAccountError(error));
    } finally {
      setSavingPassword(false);
    }
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
                ? "Conectado com Google. Você também pode criar uma senha local para entrar sem abrir o navegador."
                : "Conta local protegida por uma senha armazenada somente nesta instalação."}
            </p>
          </div>
        </article>
        <article className="settings-card account-password-card">
          <span className="settings-icon">⌑</span>
          <div>
            <div className="card-kicker">ACCOUNT SECURITY</div>
            <h2>
              {account?.passwordHash
                ? "Alterar senha local"
                : "Criar senha local"}
            </h2>
            <p>
              Esta não é a senha da sua conta Google. É uma senha de acesso ao
              WHOOP MG Lab, útil para abrir o desktop mesmo quando o Google
              estiver indisponível.
            </p>
            <form
              className="account-password-form"
              onSubmit={(event) => void submitPassword(event)}
            >
              {account?.passwordHash && (
                <input
                  type="password"
                  placeholder="Senha atual"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              )}
              <input
                type="password"
                placeholder="Nova senha (8+ caracteres)"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <input
                type="password"
                placeholder="Confirme a nova senha"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {passwordError && (
                <span className="form-message error-message" role="alert">
                  {passwordError}
                </span>
              )}
              {passwordMessage && (
                <span className="form-message success-message" role="status">
                  {passwordMessage}
                </span>
              )}
              <button
                className="primary-button"
                type="submit"
                disabled={savingPassword}
              >
                {savingPassword
                  ? "Saving…"
                  : account?.passwordHash
                    ? "Update password"
                    : "Set password"}
              </button>
            </form>
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
  onSetPassword,
  demoMode = false,
}: {
  user: NonNullable<ReturnType<typeof useGoogleAuth>["user"]>;
  token: string;
  onLogout: () => void;
  onSetPassword: (password: string, currentPassword?: string) => Promise<void>;
  demoMode?: boolean;
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
      setSnapshot(
        demoMode
          ? { ...demoSnapshot, lastSync: new Date().toISOString() }
          : await readAccountSnapshot(token, user),
      );
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
              {snapshot?.dataAvailable ? "LIVE" : "READY"}
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
            <MoreView
              user={user}
              onLogout={onLogout}
              onSetPassword={onSetPassword}
            />
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
                      ? "Data is current"
                      : "Waiting for your first sync"}
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
                  title={recovery ? "Ready to perform" : "No score yet"}
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
                  title={sleepPerformance ? "Sleep complete" : "No sleep yet"}
                  description={
                    sleepPerformance
                      ? "A clear view of last night."
                      : "Wear your device overnight."
                  }
                  footer={[
                    "LAST NIGHT",
                    sleepDuration ? `${sleepDuration} h` : "—",
                    "STATUS",
                    sleepPerformance ? "MEASURED" : "WAITING",
                  ]}
                />
                <ScoreCard
                  label="STRAIN"
                  onOpen={() => setView("Strain")}
                  value={strain}
                  tone="strain"
                  focused={view === "Strain"}
                  title={strain ? "Day in progress" : "No strain yet"}
                  description={
                    strain
                      ? "Keep an eye on your daily load."
                      : "Your activity will appear here."
                  }
                  footer={[
                    "HEART RATE",
                    `${metricMap.get("heart_rate")?.value ?? "—"} bpm`,
                    "GOAL",
                    "BUILDING",
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
                  {refreshing ? "SYNCING…" : "SYNC NOW"}
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
              <TrendCard hasData={Boolean(snapshot?.dataAvailable)} />
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
        {(demoMode || !isBackendConfigured()) && (
          <div className="local-badge">
            {demoMode ? "DEMO MODE · LOCAL" : "LOCAL MODE"}
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  const auth = useGoogleAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [localUser, setLocalUser] = useState<AppUser | null>(null);
  useEffect(() => {
    if (auth.user) void rememberGoogleAccount(auth.user);
  }, [auth.user]);

  const setPasswordForActiveAccount = async (
    password: string,
    currentPassword?: string,
  ) => {
    const activeUser = auth.user ?? localUser;
    if (!activeUser) throw new Error("LOCAL_ACCOUNT_NOT_FOUND");
    if (!currentLocalAccount()) {
      if (auth.user) await rememberGoogleAccount(auth.user);
      else {
        await createOrVerifyLocalAccount(activeUser.email, password, true);
        return;
      }
    }
    await setLocalPassword(activeUser.email, password, currentPassword);
  };

  const leaveLocalSession = () => {
    setLocalUser(null);
    setDemoMode(false);
  };
  if (demoMode || localUser)
    return (
      <Dashboard
        user={localUser ?? demoUser}
        token={localUser ? `local-token:${localUser.sub}` : "demo-token"}
        onLogout={leaveLocalSession}
        onSetPassword={setPasswordForActiveAccount}
        demoMode
      />
    );
  if (auth.status !== "signed_in" || !auth.user || !auth.accessToken)
    return (
      <AccountGate
        configured={auth.configured}
        status={auth.status}
        error={auth.error}
        onSignIn={() => void auth.signIn()}
        onLocalSignIn={async (email, password, create) => {
          const account = await createOrVerifyLocalAccount(
            email,
            password,
            create,
          );
          setLocalUser({
            sub: account.googleSub ?? `local-${email}`,
            name: account.name,
            email: account.email,
            picture: "",
          });
        }}
        onDemo={() => setDemoMode(true)}
      />
    );
  return (
    <Dashboard
      user={auth.user}
      token={auth.accessToken}
      onLogout={auth.signOut}
      onSetPassword={setPasswordForActiveAccount}
    />
  );
}
