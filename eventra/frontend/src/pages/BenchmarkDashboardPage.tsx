import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw, Info, ArrowLeft } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export const BenchmarkDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadBenchmarks = () => {
    setLoading(true);
    apiRequest("/benchmark/results")
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const handleSyncBenchmarks = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await apiRequest("/benchmark/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSyncMessage(res.message);
      loadBenchmarks();
    } catch (err: any) {
      setSyncMessage(err.message || "Failed to synchronize benchmark records.");
    } finally {
      setSyncing(false);
    }
  };

  const operations = ["MINT_TICKET", "TRANSFER_TICKET", "RESALE_TICKET", "VERIFY_ENTRY"];
  const chartData = operations.map((op) => {
    const suiRow = data?.aggregated?.find(
      (r: any) => r.operationType === op && r.blockchain === "SUI"
    );
    const ethRow = data?.aggregated?.find(
      (r: any) => r.operationType === op && r.blockchain === "ETHEREUM"
    );
    return {
      operation: op,
      EthereumGasUnits: ethRow?.measured ? ethRow.avgCostNumeric : 0,
      EthereumLatencyMs: ethRow?.measured ? ethRow.avgLatencyMs : 0,
      SuiMistNet: suiRow?.measured ? suiRow.avgCostNumeric : 0,
      SuiLatencyMs: suiRow?.measured ? suiRow.avgLatencyMs : 0,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Technical Overview
        </Link>

        {(user?.role === "ADMIN" || user?.role === "ORGANIZER") && (
          <button
            type="button"
            disabled={syncing}
            onClick={handleSyncBenchmarks}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary text-xs font-medium px-4 py-2.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synchronizing..." : "Sync Recorded Benchmark Trials"}
          </button>
        )}
      </div>

      <div className="pb-6 border-b border-border-muted">
        <span className="text-xs font-medium text-accent-cyan">
          Administrative Evaluation Benchmark
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
          Blockchain Cost & Latency Evaluation
        </h1>
        <p className="text-sm text-text-secondary mt-1.5 max-w-3xl">
          Empirical comparison of core ticketing operations across Sui Move and Ethereum Solidity
          for academic project evaluation.
        </p>
      </div>

      {/* Methodology Note */}
      <div className="rounded-2xl bg-bg-secondary border border-border-muted p-5 flex items-start gap-3 text-xs text-text-secondary leading-relaxed">
        <Info className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
        <div>
          <strong className="text-text-primary">Measurement Methodology:</strong>{" "}
          {data?.methodologyNote ||
            "Ethereum costs are measured in actual EVM gas units consumed on the local Hardhat execution network. Sui costs are measured in net MIST from live Sui Testnet transaction effects. Unmeasured operations are reported honestly as 'Not measured'."}
        </div>
      </div>

      {syncMessage && (
        <div className="rounded-xl border border-status-success/40 bg-status-success/10 p-4 text-xs text-status-success">
          {syncMessage}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
          <h2 className="font-display font-bold text-lg text-text-primary border-b border-border-muted pb-3">
            Measured Ethereum EVM Gas by Operation (Gas Units)
          </h2>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#28344D" />
                <XAxis dataKey="operation" tick={{ fill: "#A3AEC2", fontSize: 11 }} />
                <YAxis tick={{ fill: "#A3AEC2", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151E32",
                    border: "1px solid #28344D",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="EthereumGasUnits"
                  name="Ethereum Avg Gas Used (Units)"
                  fill="#8B5CF6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
          <h2 className="font-display font-bold text-lg text-text-primary border-b border-border-muted pb-3">
            Measured Execution Latency (Milliseconds)
          </h2>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#28344D" />
                <XAxis dataKey="operation" tick={{ fill: "#A3AEC2", fontSize: 11 }} />
                <YAxis tick={{ fill: "#A3AEC2", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151E32",
                    border: "1px solid #28344D",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="EthereumLatencyMs"
                  name="Ethereum Avg Latency (ms)"
                  fill="#8B5CF6"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="SuiLatencyMs"
                  name="Sui Avg Latency (ms)"
                  fill="#38BDF8"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
        <div className="p-6 border-b border-border-muted">
          <h2 className="font-display font-bold text-lg text-text-primary">
            Recorded Benchmark Measurements
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-xs text-text-secondary">Loading benchmark measurements...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                  <th className="p-4 font-medium">Blockchain</th>
                  <th className="p-4 font-medium">Operation</th>
                  <th className="p-4 font-medium">Trials</th>
                  <th className="p-4 font-medium">Average Cost</th>
                  <th className="p-4 font-medium">Average Latency</th>
                  <th className="p-4 font-medium">Median Latency</th>
                  <th className="p-4 font-medium">Network</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted">
                {data?.aggregated?.map((row: any, idx: number) => (
                  <tr
                    key={`${row.blockchain}-${row.operationType}-${idx}`}
                    className="hover:bg-bg-secondary/40"
                  >
                    <td className="p-4">
                      <span
                        className={`rounded-lg px-2.5 py-1 font-medium ${
                          row.blockchain === "SUI"
                            ? "bg-accent-cyan/15 text-accent-cyan"
                            : "bg-accent-violet/15 text-accent-violet"
                        }`}
                      >
                        {row.blockchain}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-text-primary">{row.operationType}</td>
                    <td className="p-4 text-text-secondary">
                      {row.measured
                        ? `${row.successCount} OK / ${row.failureCount} Fail (n=${row.sampleCount})`
                        : "Not measured"}
                    </td>
                    <td className="p-4">
                      {row.measured ? (
                        <strong className="text-text-primary">
                          {row.avgCostNumeric?.toLocaleString()} ({row.costUnitLabel})
                        </strong>
                      ) : (
                        <span className="text-text-secondary">Not measured</span>
                      )}
                    </td>
                    <td className="p-4 text-text-primary">
                      {row.measured ? `${row.avgLatencyMs} ms` : "Not measured"}
                    </td>
                    <td className="p-4 text-text-secondary">
                      {row.measured ? `${row.medianLatencyMs} ms` : "Not measured"}
                    </td>
                    <td className="p-4 font-mono text-accent-cyan">{row.network}</td>
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
