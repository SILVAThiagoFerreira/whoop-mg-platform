import { useEffect, useMemo, useState } from "react";
import { useGoogleAuth } from "./auth/useGoogleAuth";
import {
  ensureAccountWorkspace,
  readAccountSnapshot,
  type AccountMetric,
  type AccountSnapshot,
  type AccountWorkspace,
} from "./data/accountStore";

type View = "Today" | "Recovery" | "Sleep" | "Strain" | "More";
type MetricDefinition = {
  label: string;
  key: string;
  unit?: string;
  tone: "lime" | "blue" | "orange" | "muted";
  emptyNote?: string;
};
const definitions: MetricDefinition[] = [
  { label: "Recovery", key: "recovery", unit: "%", tone: "lime" },
  { label: "Sleep", key: "sleep_duration", unit: "h", tone: "blue" },
  { label: "Strain", key: "strain", tone: "orange" },
  { label: "HRV", key: "hrv", unit: "ms", tone: "lime" },
  { label: "Resting HR", key: "rhr", unit: "bpm", tone: "blue" },
  { label: "Heart Rate", key: "heart_rate", unit: "bpm", tone: "orange" },
  {
    label: "SpO₂",
    key: "spo2",
    unit: "%",
    tone: "muted",
    emptyNote: "Not available yet",
  },
  {
    label: "Respiratory Rate",
    key: "respiratory_rate",
    unit: "rpm",
    tone: "muted",
    emptyNote: "Not available yet",
  },
  {
    label: "Skin Temperature",
    key: "skin_temperature",
    unit: "°C",
    tone: "muted",
    emptyNote: "Not available yet",
  },
  {
    label: "Battery",
    key: "battery",
    unit: "%",
    tone: "muted",
    emptyNote: "Collector not connected",
  },
];

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
      <div className="account-mark">
        <span>◎</span>
        <div>
          <div className="eyebrow">WHOOP MG LAB</div>
          <strong>PRIVATE HEALTH DATA</strong>
        </div>
      </div>
      <section className="account-card">
        <div className="eyebrow">PERSONAL PERFORMANCE INTELLIGENCE</div>
        <h1>
          Your data.
          <br />
          <em>Your account.</em>
        </h1>
        <p className="account-lead">
          Create or access your private workspace with Google. Your health data
          is never shown before authentication.
        </p>
        <div className="account-security">
          <span className="lock">⌾</span>
          <div>
            <strong>Private by default</strong>
            <p>
              Each Google account gets its own Drive folder and spreadsheet. The
              app uses your account ID, never an email as a database key.
            </p>
          </div>
        </div>
        {!configured && (
          <div className="setup-warning">
            <strong>Login ainda não configurado</strong>
            <p>
              Configure <code>VITE_GOOGLE_CLIENT_ID</code> no build do Pages
              para habilitar criação e acesso de contas.
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
          {status === "loading"
            ? "Abrindo o Google…"
            : "Entrar ou criar conta com Google"}
        </button>
        <p className="account-disclaimer">
          O login autoriza somente o acesso aos arquivos que o WHOOP MG Lab cria
          na sua conta. Você pode revogar o acesso no Google a qualquer momento.
        </p>
      </section>
      <p className="account-footer">
        Unofficial personal analytics platform · no WHOOP subscription required
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
  const value = metric?.value ?? "—";
  const note = metric
    ? `${metric.sourceType ?? "SOURCE UNKNOWN"}${metric.source ? ` · ${metric.source}` : ""}`
    : (definition.emptyNote ?? "No data synchronized yet");
  return (
    <article className={`metric-card ${definition.tone}`}>
      <div className="metric-label">{definition.label}</div>
      <div className="metric-value">
        {value}
        <small>{metric?.unit ?? definition.unit}</small>
      </div>
      <div className="metric-note">{note}</div>
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
  const [workspace, setWorkspace] = useState<AccountWorkspace | null>(null);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const accountWorkspace =
        workspace ?? (await ensureAccountWorkspace(token, user));
      setWorkspace(accountWorkspace);
      setSnapshot(await readAccountSnapshot(token, accountWorkspace));
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Não foi possível ler os dados desta conta.";
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
  const visibleDefinitions =
    view === "Recovery"
      ? definitions.filter((item) =>
          ["recovery", "hrv", "rhr"].includes(item.key),
        )
      : view === "Sleep"
        ? definitions.filter((item) =>
            ["sleep_duration", "respiratory_rate", "skin_temperature"].includes(
              item.key,
            ),
          )
        : view === "Strain"
          ? definitions.filter((item) =>
              ["strain", "heart_rate"].includes(item.key),
            )
          : definitions;
  const collectorLabel =
    snapshot?.collectorStatus === "online"
      ? "Collector online"
      : snapshot?.collectorStatus === "offline"
        ? "Collector offline"
        : "Collector status unknown";
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">WHOOP MG LAB</div>
          <h1>{view}</h1>
        </div>
        <div className="user-chip">
          <span className="avatar">
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="user-email">{user.email}</span>
          <button className="logout-button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>
      <main>
        <section className="hero-card">
          <div>
            <div className="eyebrow">PRIVATE ACCOUNT WORKSPACE</div>
            <h2>
              Know the signal.
              <br />
              <em>Keep the context.</em>
            </h2>
            <p>{user.name ?? user.email} · dados separados por conta</p>
          </div>
          <div className="hero-ring locked-ring">
            <strong>⌾</strong>
            <span>private</span>
          </div>
        </section>
        <section className="sync-card">
          <div>
            <div className="card-kicker">ACCOUNT DATA</div>
            <h3>{loading ? "Opening private workspace" : collectorLabel}</h3>
            <p>
              {loading
                ? "Creating or finding your Drive workspace…"
                : snapshot?.dataAvailable
                  ? `Last sync: ${snapshot.lastSync ?? "unknown"}`
                  : "No WHOOP data has been synchronized for this account yet."}
            </p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading || refreshing}
          >
            {refreshing ? "REFRESHING…" : "REFRESH DATA"}
          </button>
        </section>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <section className="section-heading">
          <div>
            <div className="card-kicker">TODAY AT A GLANCE</div>
            <h3>Only this account</h3>
          </div>
          <span>
            {snapshot?.dataAvailable ? "Measured/derived data" : "No data yet"}
          </span>
        </section>
        {loading ? (
          <section className="empty-state">
            <div className="loading-dots">•••</div>
            <h3>Preparing your private data space</h3>
            <p>
              Nothing is displayed until the authorized account workspace is
              ready.
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
        <section className="chart-card">
          <div className="section-heading">
            <div>
              <div className="card-kicker">TREND VIEW</div>
              <h3>Account history</h3>
            </div>
            <span>Local collector → Drive → this account</span>
          </div>
          <div className="empty-state compact">
            <h3>
              {snapshot?.dataAvailable
                ? "Trend engine ready"
                : "No trend data yet"}
            </h3>
            <p>
              {snapshot?.dataAvailable
                ? "Historical charts will appear as the collector uploads timestamped samples."
                : "Run the local collector to create the first synchronized sample."}
            </p>
          </div>
        </section>
        {workspace && (
          <section className="source-note">
            <span className="lock">⌾</span>
            <div>
              <strong>Storage isolated to this Google account.</strong>
              <p>
                Workspace folder:{" "}
                <a
                  className="data-link"
                  href={workspace.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  open your private spreadsheet
                </a>
                . The Pages app does not contain your health database.
              </p>
            </div>
          </section>
        )}
      </main>
      <nav className="bottom-nav">
        {(["Today", "Recovery", "Sleep", "Strain", "More"] as View[]).map(
          (item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              <span className="nav-icon">
                {item === "Today"
                  ? "◉"
                  : item === "Recovery"
                    ? "↗"
                    : item === "Sleep"
                      ? "◒"
                      : item === "Strain"
                        ? "⌁"
                        : "•••"}
              </span>
              {item}
            </button>
          ),
        )}
      </nav>
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
