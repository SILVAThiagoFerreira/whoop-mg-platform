import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Metric = {
  label: string;
  value: string;
  unit?: string;
  tone: "lime" | "blue" | "orange" | "muted";
  note: string;
};
type View = "Today" | "Recovery" | "Sleep" | "Strain" | "More";
const chartData = [
  { day: "Mon", recovery: 72, sleep: 81 },
  { day: "Tue", recovery: 68, sleep: 74 },
  { day: "Wed", recovery: 77, sleep: 86 },
  { day: "Thu", recovery: 63, sleep: 69 },
  { day: "Fri", recovery: 71, sleep: 78 },
  { day: "Sat", recovery: 84, sleep: 91 },
  { day: "Sun", recovery: 79, sleep: 88 },
];
const metrics: Metric[] = [
  {
    label: "Recovery",
    value: "79",
    unit: "%",
    tone: "lime",
    note: "DEMO DATA · derived mock",
  },
  {
    label: "Sleep",
    value: "8:12",
    unit: "h",
    tone: "blue",
    note: "DEMO DATA · mock session",
  },
  {
    label: "Strain",
    value: "12.4",
    tone: "orange",
    note: "DEMO DATA · not WHOOP score",
  },
  {
    label: "HRV",
    value: "54",
    unit: "ms",
    tone: "lime",
    note: "DEMO DATA · mock shape",
  },
  {
    label: "Resting HR",
    value: "49",
    unit: "bpm",
    tone: "blue",
    note: "DEMO DATA · mock shape",
  },
  {
    label: "Heart Rate",
    value: "72",
    unit: "bpm",
    tone: "orange",
    note: "DEMO DATA · mock view",
  },
  { label: "SpO₂", value: "—", tone: "muted", note: "Not available yet" },
  {
    label: "Respiratory Rate",
    value: "—",
    tone: "muted",
    note: "Not available yet",
  },
  {
    label: "Skin Temperature",
    value: "—",
    tone: "muted",
    note: "Not available yet",
  },
  {
    label: "Battery",
    value: "—",
    tone: "muted",
    note: "Collector not connected",
  },
];
function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className={`metric-card ${metric.tone}`}>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-value">
        {metric.value}
        <small>{metric.unit}</small>
      </div>
      <div className="metric-note">{metric.note}</div>
    </article>
  );
}
export function App() {
  const [view, setView] = useState<View>("Today");
  const [syncing, setSyncing] = useState(false);
  const visibleMetrics = useMemo(
    () =>
      view === "Recovery"
        ? metrics.filter((m) =>
            ["Recovery", "HRV", "Resting HR"].includes(m.label),
          )
        : view === "Sleep"
          ? metrics.filter((m) =>
              ["Sleep", "Respiratory Rate", "Skin Temperature"].includes(
                m.label,
              ),
            )
          : view === "Strain"
            ? metrics.filter((m) => ["Strain", "Heart Rate"].includes(m.label))
            : metrics,
    [view],
  );
  const startSync = () => {
    setSyncing(true);
    window.setTimeout(() => setSyncing(false), 1600);
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">WHOOP MG LAB</div>
          <h1>{view}</h1>
        </div>
        <div className="status-pill">
          <span className="status-dot" /> DEMO DATA
        </div>
      </header>
      <main>
        <section className="hero-card">
          <div>
            <div className="eyebrow">PERSONAL PERFORMANCE INTELLIGENCE</div>
            <h2>
              Know the signal.
              <br />
              <em>Keep the context.</em>
            </h2>
            <p>Unofficial personal analytics platform for your WHOOP 5.0 MG.</p>
          </div>
          <div className="hero-ring">
            <strong>79</strong>
            <span>recovery</span>
          </div>
        </section>
        <section className="sync-card">
          <div>
            <div className="card-kicker">SYNC STATUS</div>
            <h3>{syncing ? "Sync in progress" : "Collector offline"}</h3>
            <p>
              {syncing
                ? "Connecting · requesting history · saving"
                : "Connect a collector to import real device data."}
            </p>
          </div>
          <button onClick={startSync} disabled={syncing}>
            {syncing ? "SYNCING…" : "SYNC NOW"}
          </button>
        </section>
        <section className="section-heading">
          <div>
            <div className="card-kicker">TODAY AT A GLANCE</div>
            <h3>Signals, clearly separated</h3>
          </div>
          <span>Last sync: never</span>
        </section>
        <section className="metrics-grid">
          {visibleMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>
        <section className="chart-card">
          <div className="section-heading">
            <div>
              <div className="card-kicker">TREND VIEW</div>
              <h3>Recovery vs. sleep</h3>
            </div>
            <span>7 days · demo</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="recovery" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d6ff3f" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d6ff3f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sleep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#66a7ff" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#66a7ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="#657080"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis domain={[40, 100]} hide />
                <Tooltip
                  contentStyle={{
                    background: "#151a22",
                    border: "1px solid #2b3441",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="recovery"
                  stroke="#d6ff3f"
                  fill="url(#recovery)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="sleep"
                  stroke="#66a7ff"
                  fill="url(#sleep)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            <span>
              <i className="lime-dot" /> Recovery
            </span>
            <span>
              <i className="blue-dot" /> Sleep quality
            </span>
          </div>
        </section>
        <section className="source-note">
          <span className="lock">◎</span>
          <div>
            <strong>Data provenance is visible by design.</strong>
            <p>
              This screen is safe demo data. Real measurements will be labeled
              by source, quality, confidence and algorithm version.
            </p>
          </div>
        </section>
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
