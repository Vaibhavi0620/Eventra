import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Cpu, Info, ArrowLeft, ShieldAlert } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export const FraudDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventFilter, setEventFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive Sandbox Predictor State
  const [simTicketsBought, setSimTicketsBought] = useState(6);
  const [simTransfers, setSimTransfers] = useState(4);
  const [simResales, setSimResales] = useState(3);
  const [simTimeDiff, setSimTimeDiff] = useState(40);
  const [simResalePrice, setSimResalePrice] = useState(1190);
  const [simOrigPrice, setSimOrigPrice] = useState(1000);
  const [simTxFreq, setSimTxFreq] = useState(9.5);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);

  const loadFraudData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (eventFilter !== "ALL") params.set("eventId", eventFilter);
    if (riskFilter !== "ALL") params.set("riskLevel", riskFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    Promise.all([
      apiRequest(`/fraud/alerts?${params.toString()}`),
      apiRequest<{ events: any[] }>("/events"),
    ])
      .then(([fraudRes, evRes]) => {
        setData(fraudRes);
        setEvents(evRes.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFraudData();
  }, [eventFilter, riskFilter]);

  const handleReviewStatus = async (alertId: string, reviewStatus: string) => {
    try {
      await apiRequest(`/fraud/alerts/${alertId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ reviewStatus }),
      });
      loadFraudData();
    } catch {
      // ignore
    }
  };

  const handleRunSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ prediction: any }>("/fraud/analyze", {
        method: "POST",
        body: JSON.stringify({
          wallet_id: "0xsandbox_eval",
          event_id: "EVT-SONIC-01",
          event_category: "ELECTRONIC",
          tickets_bought: Number(simTicketsBought),
          transfers: Number(simTransfers),
          resales: Number(simResales),
          time_diff: Number(simTimeDiff),
          resale_price: Number(simResalePrice),
          original_price: Number(simOrigPrice),
          transaction_frequency: Number(simTxFreq),
        }),
      });
      setSandboxResult(res.prediction);
    } catch {
      // ignore
    }
  };

  const metrics = data?.modelMetrics;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Organizer Dashboard
        </Link>
        <span className="rounded-xl bg-bg-card border border-border-muted px-3.5 py-1.5 text-xs text-accent-cyan">
          Model: {metrics?.model_name || "RandomForestClassifier"}
        </span>
      </div>

      {/* Header & Explanation */}
      <div className="pb-6 border-b border-border-muted space-y-4">
        <div>
          <span className="text-xs font-medium text-accent-violet">
            Organizer & Admin Security Module
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
            AI Fraud & Bot Activity Detection
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1.5 max-w-3xl">
            EVENTRA uses a trained machine-learning model to analyze buying patterns—such as rapid
            ticket accumulation, repeated transfers, short holding intervals, and resale pricing—to
            highlight suspected scalping or automated bot activity for organizer review.
          </p>
        </div>

        {/* Distinction Banner */}
        <div className="rounded-2xl bg-bg-secondary border border-border-muted p-4 flex items-start gap-3 text-xs text-text-secondary leading-relaxed">
          <Info className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
          <div>
            <strong className="text-text-primary">
              Suspected Activity vs. Confirmed Fraud:
            </strong>{" "}
            A <span className="text-status-error font-medium">Suspected Activity</span> flag from
            the ML model is an advisory signal for organizer review rather than automatic proof of
            fraud. Hard price caps and single-entry QR admission are enforced directly by the smart
            contract and verification engine.
          </div>
        </div>
      </div>

      {/* Top Summary Metrics */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
            <div className="text-xs text-text-secondary">Transactions Evaluated</div>
            <div className="font-display text-3xl font-bold text-text-primary mt-2">
              {data.summary.totalAnalyzed}
            </div>
          </div>
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
            <div className="text-xs text-text-secondary">Normal Fan Activity</div>
            <div className="font-display text-3xl font-bold text-status-success mt-2">
              {data.summary.normalCount}
            </div>
          </div>
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
            <div className="text-xs text-text-secondary">Flagged Suspected Activity</div>
            <div className="font-display text-3xl font-bold text-status-error mt-2">
              {data.summary.flaggedCount}
            </div>
          </div>
        </div>
      )}

      {/* Charts & Held-Out Test Evaluation Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
          <h2 className="font-display font-bold text-lg text-text-primary border-b border-border-muted pb-3">
            Risk Score Distribution
          </h2>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.summary?.riskDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#28344D" />
                <XAxis dataKey="range" tick={{ fill: "#A3AEC2", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#A3AEC2", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151E32",
                    border: "1px solid #28344D",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Transactions" radius={[8, 8, 0, 0]}>
                  {(data?.summary?.riskDistribution || []).map((_entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 2 ? "#FB7185" : index === 1 ? "#FBBF24" : "#6EE7B7"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Held-Out Test Set Metrics */}
        <div className="lg:col-span-6 rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-border-muted pb-3">
            <h2 className="font-display font-bold text-lg text-text-primary">
              Classifier Evaluation (Held-Out Test Split)
            </h2>
            <span className="rounded-lg bg-bg-secondary border border-border-muted px-2.5 py-1 text-xs font-mono text-accent-cyan">
              Seed={metrics?.random_seed ?? 42}
            </span>
          </div>

          {metrics ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                  <div className="text-[11px] text-text-secondary">Accuracy</div>
                  <div className="font-display text-lg font-bold text-text-primary mt-1">
                    {(metrics.accuracy * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                  <div className="text-[11px] text-text-secondary">Precision</div>
                  <div className="font-display text-lg font-bold text-text-primary mt-1">
                    {(metrics.precision * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                  <div className="text-[11px] text-text-secondary">Recall</div>
                  <div className="font-display text-lg font-bold text-text-primary mt-1">
                    {(metrics.recall * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl bg-accent-violet/15 border border-accent-violet/40 p-3">
                  <div className="text-[11px] text-accent-violet">F1-Score</div>
                  <div className="font-display text-lg font-bold text-text-primary mt-1">
                    {(metrics.f1_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-1 text-text-secondary">
                  <div className="font-semibold text-text-primary mb-1">
                    Confusion Matrix (n={metrics.test_samples})
                  </div>
                  <div>True Negative (Normal): {metrics.confusion_matrix.true_negative}</div>
                  <div>False Positive: {metrics.confusion_matrix.false_positive}</div>
                  <div>False Negative: {metrics.confusion_matrix.false_negative}</div>
                  <div>True Positive (Suspicious): {metrics.confusion_matrix.true_positive}</div>
                </div>

                <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-1">
                  <div className="font-semibold text-text-primary mb-1">Dataset Note</div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {metrics.limitations_note}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 text-xs text-text-secondary">
              Model metrics not loaded.
            </div>
          )}
        </div>
      </div>

      {/* Live Inference Sandbox */}
      <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-muted pb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">
              Interactive ML Pattern Tester
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Test how the trained classifier scores different ticket acquisition and resale
              behaviors in real time.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setSimTicketsBought(1);
                setSimTransfers(0);
                setSimResales(0);
                setSimTimeDiff(3600);
                setSimResalePrice(1000);
                setSimOrigPrice(1000);
                setSimTxFreq(0.5);
              }}
              className="rounded-xl bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-3.5 py-2 text-text-primary transition-colors"
            >
              Preset: Genuine Fan
            </button>
            <button
              type="button"
              onClick={() => {
                setSimTicketsBought(8);
                setSimTransfers(5);
                setSimResales(4);
                setSimTimeDiff(32);
                setSimResalePrice(1195);
                setSimOrigPrice(1000);
                setSimTxFreq(11.5);
              }}
              className="rounded-xl bg-status-error/15 hover:bg-status-error/25 border border-status-error/30 px-3.5 py-2 text-status-error transition-colors"
            >
              Preset: Rapid Bot / Scalper
            </button>
          </div>
        </div>

        <form
          onSubmit={handleRunSandbox}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs items-end"
        >
          <div>
            <label className="block text-text-secondary mb-1">Tickets Bought</label>
            <input
              type="number"
              value={simTicketsBought}
              onChange={(e) => setSimTicketsBought(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Transfers</label>
            <input
              type="number"
              value={simTransfers}
              onChange={(e) => setSimTransfers(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Resales</label>
            <input
              type="number"
              value={simResales}
              onChange={(e) => setSimResales(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Hold Time (s)</label>
            <input
              type="number"
              value={simTimeDiff}
              onChange={(e) => setSimTimeDiff(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Resale Price</label>
            <input
              type="number"
              value={simResalePrice}
              onChange={(e) => setSimResalePrice(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Orig Price</label>
            <input
              type="number"
              value={simOrigPrice}
              onChange={(e) => setSimOrigPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-text-secondary mb-1">Tx / Hour</label>
            <input
              type="number"
              step="0.1"
              value={simTxFreq}
              onChange={(e) => setSimTxFreq(Number(e.target.value))}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium py-2 px-4 transition-colors"
          >
            Evaluate
          </button>
        </form>

        {sandboxResult && (
          <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 text-xs space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-lg px-2.5 py-1 font-medium ${
                  sandboxResult.predicted_label === "SUSPICIOUS"
                    ? "bg-status-error/15 text-status-error border border-status-error/30"
                    : "bg-status-success/15 text-status-success border border-status-success/30"
                }`}
              >
                {sandboxResult.predicted_label === "SUSPICIOUS"
                  ? "Suspected Activity"
                  : "Normal Activity"}
              </span>
              <span className="text-text-secondary">
                Risk Score:{" "}
                <strong className="text-text-primary">{sandboxResult.risk_score}</strong>
              </span>
              <span className="text-text-secondary">
                Confidence:{" "}
                <strong className="text-text-primary">{sandboxResult.confidence}</strong>
              </span>
            </div>
            <div className="text-text-secondary">
              <strong className="text-text-primary">Reasons:</strong>{" "}
              {sandboxResult.reasons.join(" • ")}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Alert Table */}
      <div className="rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
        <div className="p-6 border-b border-border-muted flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display font-bold text-lg text-text-primary">
            Transaction Risk Log
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadFraudData()}
              placeholder="Search wallet or tx ID..."
              className="rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            >
              <option value="ALL">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name.slice(0, 28)}
                </option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-text-primary"
            >
              <option value="ALL">All Classifications</option>
              <option value="SUSPICIOUS">Suspected Only</option>
              <option value="NORMAL">Normal Only</option>
              <option value="HIGH">High Risk (&ge; 0.75)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-text-secondary">
            Loading transaction evaluations...
          </div>
        ) : !data?.alerts || data.alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-secondary">
            No transactions match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                  <th className="p-4 font-medium">Transaction & Time</th>
                  <th className="p-4 font-medium">Wallet Identifier</th>
                  <th className="p-4 font-medium">Event</th>
                  <th className="p-4 font-medium">Activity Signals</th>
                  <th className="p-4 font-medium">Classification & Risk</th>
                  <th className="p-4 font-medium">Model Reasons</th>
                  <th className="p-4 font-medium">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {data.alerts.map((al: any) => (
                  <tr key={al.id} className="hover:bg-bg-secondary/40">
                    <td className="p-4 align-top">
                      <div className="font-mono text-text-primary">
                        {al.transactionId.slice(0, 10)}...
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {new Date(al.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 align-top font-mono text-accent-cyan break-all max-w-[140px]">
                      {al.walletAddress}
                    </td>
                    <td className="p-4 align-top text-text-primary">
                      {al.transaction?.ticket?.event?.name || "Event"}
                    </td>
                    <td className="p-4 align-top text-text-secondary space-y-0.5">
                      <div>Tickets: {al.ticketsBoughtFeature}</div>
                      <div>
                        Transfers: {al.transfersFeature} • Resales: {al.resalesFeature}
                      </div>
                      <div>
                        Price Ratio: {al.priceRatio}x • {al.txFrequencyPerHour}/hr
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <span
                        className={`inline-block rounded-lg px-2.5 py-0.5 font-medium ${
                          al.predictedLabel === "SUSPICIOUS"
                            ? "bg-status-error/15 text-status-error border border-status-error/30"
                            : "bg-status-success/15 text-status-success border border-status-success/30"
                        }`}
                      >
                        {al.predictedLabel === "SUSPICIOUS" ? "Suspected" : "Normal"}
                      </span>
                      <div className="font-medium text-text-primary mt-1">
                        Score: {al.riskScore.toFixed(3)}
                      </div>
                    </td>
                    <td className="p-4 align-top max-w-xs text-text-secondary">
                      <ul className="space-y-0.5">
                        {al.reasons.map((r: string, idx: number) => (
                          <li key={idx}>• {r}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-[11px] font-medium text-text-secondary mb-1.5">
                        {al.reviewStatus.replace("_", " ")}
                      </div>
                      {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleReviewStatus(al.id, "ACKNOWLEDGED")}
                            className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2 py-1 text-[11px] text-text-primary"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewStatus(al.id, "RESTRICTED")}
                            className="rounded-lg bg-status-error/15 hover:bg-status-error/25 border border-status-error/30 px-2 py-1 text-[11px] text-status-error"
                          >
                            Restrict
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewStatus(al.id, "DISMISSED")}
                            className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2 py-1 text-[11px] text-text-secondary"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
