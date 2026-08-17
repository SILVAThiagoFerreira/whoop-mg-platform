import { useEffect, useMemo, useState } from "react";
import { useGoogleAuth } from "./auth/useGoogleAuth";
import {
  isBackendConfigured,
  readAccountSnapshot,
  type AccountMetric,
  type AccountSnapshot,
} from "./data/accountStore";

type View = "Today" | "Recovery" | "Strain" | "Sleep" | "More";
type MetricDefinition = {
  label: string;
  key: string;
  unit?: string;
  tone: "recovery" | "sleep" | "strain" | "neutral";
  emptyNote?: string;
};

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
    emptyNote: "NOOP not connected",
  },
];

function ScoreRing({
  value,
  tone,
  label,
}: {
  value?: string;
  tone: "recovery" | "sleep" | "strain";
  label: string;
}) {
  const numeric = value ? Number.parseFloat(value) : Number.NaN;
  const progress = Number.isFinite(numeric)
    ? Math.min(1, Math.max(0, numeric / (tone === "strain" ? 21 : 100)))
    : 0;
  const radius = 51;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className={`score-ring ${tone}`}
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

function AccountGate({
  configured,
  status,
  error,
  onSignIn,
}: {
  configured: boolean;
  status: string;
  error: string | null;
  onSignIn: () => void;
}) {
  return (
    <div className="account-gate">
      <div className="whoop-wordmark">
        WHOOP <span>MG</span>
      </div>
      <section className="account-card">
        <div className="gate-visual" aria-hidden="true">
          <div className="gate-orbit orbit-one" />
          <div className="gate-orbit orbit-two" />
          <div className="gate-core">◉</div>
        </div>
        <div className="eyebrow">PERSONAL PERFORMANCE</div>
        <h1>
          Train smarter.
          <br />
          <em>Recover better.</em>
        </h1>
        <p className="account-lead">
          Sign in to see your recovery, sleep and strain in one calm, focused
          view.
        </p>
        <div className="account-security">
          <span className="security-icon">⌾</span>
          <div>
            <strong>Private by design</strong>
            <p>
              Google is used only to identify your account. Health data stays
              inside NOOP or the private service — never in your browser links.
            </p>
          </div>
        </div>
        {!configured && (
          <div className="setup-warning">
            <strong>Login ainda não configurado</strong>
            <p>
              Configure <code>VITE_GOOGLE_CLIENT_ID</code> no build do Pages.
            </p>
          </div>
        )}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <button
          className="google-button"
          onClick={onSignIn}
          disabled={!configured || status === "loading"}
        >
          <span className="google-g">G</span>
          {status === "loading" ? "Opening Google…" : "Continue with Google"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="account-disclaimer">
          No Drive or Sheets permission is requested by this app.
        </p>
      </section>
      <p className="account-footer">
        Unofficial WHOOP-compatible analytics · NOOP powered
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
    // A token refresh is user-driven by design; this effect runs once per sign-in.
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
  const visibleDefinitions =
    view === "Recovery"
      ? definitions.filter((item) => ["hrv", "rhr", "spo2"].includes(item.key))
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
  const recovery = metricMap.get("recovery")?.value;
  const sleep =
    metricMap.get("sleep")?.value ?? metricMap.get("sleep_performance")?.value;
  const strain = metricMap.get("strain")?.value;
  const firstName = (user.name ?? user.email).split(" ")[0];
  const storageLabel =
    snapshot?.storage === "server" ? "Private service" : "NOOP local mode";
  const statusLabel = snapshot?.dataAvailable
    ? "All systems ready"
    : (snapshot?.message ?? "Waiting for your first sync");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="whoop-wordmark">
            WHOOP <span>MG</span>
          </div>
          <span className="topbar-context">PERSONAL PERFORMANCE</span>
        </div>
        <div className="user-chip">
          <span className="avatar">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="user-email">{user.name ?? user.email}</span>
          <button className="logout-button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main>
        <section className="welcome-row">
          <div>
            <div className="eyebrow">
              {new Date()
                .toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })
                .toUpperCase()}
            </div>
            <h1>Good morning, {firstName}</h1>
            <p>Here&apos;s how your body is doing today.</p>
          </div>
          <div
            className={`system-status ${snapshot?.dataAvailable ? "ready" : ""}`}
          >
            <span className="status-dot" />{" "}
            {snapshot?.dataAvailable ? "LIVE" : "READY"}
          </div>
        </section>

        <section className="score-grid" aria-label="Today's scores">
          <article className="score-card recovery-card">
            <div className="score-card-header">
              <span>RECOVERY</span>
              <span>↗</span>
            </div>
            <div className="score-body">
              <ScoreRing value={recovery} tone="recovery" label="Recovery" />
              <div>
                <strong className="score-title">
                  {recovery ? "Ready to perform" : "No score yet"}
                </strong>
                <p>
                  {recovery
                    ? "Your body is primed for the day."
                    : "Connect NOOP to start your baseline."}
                </p>
              </div>
            </div>
            <div className="score-card-footer">
              <span>HRV</span>
              <b>{metricMap.get("hrv")?.value ?? "—"} ms</b>
              <span>RHR</span>
              <b>{metricMap.get("rhr")?.value ?? "—"} bpm</b>
            </div>
          </article>
          <article className="score-card sleep-card">
            <div className="score-card-header">
              <span>SLEEP</span>
              <span>↗</span>
            </div>
            <div className="score-body">
              <ScoreRing value={sleep} tone="sleep" label="Sleep" />
              <div>
                <strong className="score-title">
                  {sleep ? "Sleep complete" : "No sleep yet"}
                </strong>
                <p>
                  {sleep
                    ? "A clear view of last night."
                    : "Wear your device overnight."}
                </p>
              </div>
            </div>
            <div className="score-card-footer">
              <span>LAST NIGHT</span>
              <b>{sleep ? `${sleep} h` : "—"}</b>
              <span>STATUS</span>
              <b>{sleep ? "MEASURED" : "WAITING"}</b>
            </div>
          </article>
          <article className="score-card strain-card">
            <div className="score-card-header">
              <span>STRAIN</span>
              <span>↗</span>
            </div>
            <div className="score-body">
              <ScoreRing value={strain} tone="strain" label="Strain" />
              <div>
                <strong className="score-title">
                  {strain ? "Day in progress" : "No strain yet"}
                </strong>
                <p>
                  {strain
                    ? "Keep an eye on your daily load."
                    : "Your activity will appear here."}
                </p>
              </div>
            </div>
            <div className="score-card-footer">
              <span>HEART RATE</span>
              <b>{metricMap.get("heart_rate")?.value ?? "—"} bpm</b>
              <span>GOAL</span>
              <b>BUILDING</b>
            </div>
          </article>
        </section>

        <section className="sync-bar">
          <div className="sync-icon">◌</div>
          <div>
            <strong>{statusLabel}</strong>
            <p>{storageLabel} · data is scoped to this signed-in account</p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading || refreshing}
          >
            {refreshing ? "SYNCING…" : "SYNC"}
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
            <h2>{view === "Today" ? "Today at a glance" : view}</h2>
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
            <p>Nothing is displayed until this signed-in account is ready.</p>
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

        <section className="trend-card">
          <div className="section-heading">
            <div>
              <div className="card-kicker">TRENDS</div>
              <h2>Understand your patterns</h2>
            </div>
            <span>30 DAYS</span>
          </div>
          <div className="trend-empty">
            <div className="trend-line" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <strong>
              {snapshot?.dataAvailable
                ? "Trend engine ready"
                : "Your trends start here"}
            </strong>
            <p>
              {snapshot?.dataAvailable
                ? "More history will make your patterns clearer."
                : "NOOP will build a personal baseline as you wear your device."}
            </p>
          </div>
        </section>
        <div className="privacy-note">
          <span>⌾</span>
          <div>
            <strong>Data stays private</strong>
            <p>
              Google Drive and Google Sheets are not exposed to this user
              interface. Storage is handled by NOOP locally or by the
              authenticated private service.
            </p>
          </div>
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {(["Today", "Recovery", "Strain", "Sleep", "More"] as View[]).map(
          (item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              <span
                className={`nav-icon nav-${item.toLowerCase()}`}
                aria-hidden="true"
              />
              {item}
            </button>
          ),
        )}
      </nav>
      {!isBackendConfigured() && <div className="local-badge">NOOP LOCAL</div>}
    </div>
  );
}

export function App() {
  const auth = useGoogleAuth();
  if (auth.status !== "signed_in" || !auth.user || !auth.accessToken)
    return (
      <AccountGate
        configured={auth.configured}
        status={auth.status}
        error={auth.error}
        onSignIn={() => void auth.signIn()}
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
