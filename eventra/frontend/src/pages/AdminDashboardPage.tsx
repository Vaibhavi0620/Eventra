import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  Layers,
  Cpu,
  Lock,
  QrCode,
  Ticket,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "../lib/api";

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"TECHNICAL_OVERVIEW" | "ADMIN_CONSOLE">(
    "TECHNICAL_OVERVIEW"
  );

  useEffect(() => {
    setLoading(true);
    apiRequest("/admin/overview")
      .then((res) => setData(res))
      .catch((err) => setError(err.message || "Failed to load admin overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-text-secondary">
        Loading administrative & technical overview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="rounded-2xl border border-status-error/40 bg-status-error/10 p-6 text-xs text-status-error">
          <strong>Admin Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border-muted">
        <div>
          <span className="text-xs font-medium text-accent-cyan">
            Administrative & Project Evaluation Area
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
            Platform Governance & Technical Overview
          </h1>
          <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">
            Plain-language architecture summary and system administration for project evaluators and
            platform administrators.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-bg-secondary p-1.5 border border-border-muted">
          <button
            type="button"
            onClick={() => setActiveView("TECHNICAL_OVERVIEW")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeView === "TECHNICAL_OVERVIEW"
                ? "bg-accent-violet text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Technical Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveView("ADMIN_CONSOLE")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeView === "ADMIN_CONSOLE"
                ? "bg-accent-violet text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            System & User Directory
          </button>
        </div>
      </div>

      {activeView === "TECHNICAL_OVERVIEW" ? (
        <div className="space-y-8">
          {/* Plain-Language Architecture Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                Role of the Sui Blockchain
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Sui treats each ticket as an independent digital object rather than an entry inside
                a single shared contract table. This allows fast confirmations, low transaction
                fees, and direct verification of who owns each ticket at any moment.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center text-accent-violet">
                <Ticket className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                NFT Ticket Ownership
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                When a customer buys a ticket, EVENTRA issues a unique digital pass tied to the
                event. Customers can view their pass, verify its authenticity, and transfer or
                resell it without relying on screenshots or easily forged PDFs.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-status-success/15 border border-status-success/30 flex items-center justify-center text-status-success">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                Move Smart Contracts & Resale Caps
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Each ticket stores both its original price and the organizer&apos;s maximum allowed
                resale price. The Move smart contract checks every resale attempt and automatically
                rejects any listing priced above the cap.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-status-warning/15 border border-status-warning/30 flex items-center justify-center text-status-warning">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                Machine Learning Fraud Detection
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                A Python Scikit-Learn Random Forest model analyzes buying speed, bulk ticket
                quantities, and rapid resales. Instead of silently blocking fans, it flags
                suspected bot activity with clear reasons so organizers can review and act.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
              <div className="w-10 h-10 rounded-xl bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center text-accent-violet">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary">
                One-Time QR Venue Verification
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Every ticket generates a signed QR code for venue entry. Scanning the code at the
                gate marks the ticket as Used in a single atomic step, preventing duplicate scans or
                copied QR codes from being used twice.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="font-display font-bold text-lg text-text-primary">
                  Academic Blockchain Evaluation
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  For academic evaluation, EVENTRA includes an administrative benchmark comparing
                  ticketing operations across Sui Move and Ethereum Solidity.
                </p>
              </div>
              <Link
                to="/benchmark"
                className="inline-flex items-center justify-center rounded-xl bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-4 py-2.5 text-xs font-medium text-accent-cyan transition-colors mt-4"
              >
                Open Blockchain Benchmark →
              </Link>
            </div>
          </div>

          {/* Live System Status Card */}
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-border-muted pb-3">
              <h3 className="font-display font-bold text-lg text-text-primary">
                Live Platform Services
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-status-success/15 text-status-success px-3 py-1 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operational
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-1">
                <div className="text-text-secondary">Database Service</div>
                <div className="font-medium text-text-primary">{data.systemStatus.database}</div>
                <div className="text-text-secondary">
                  Mode: {data.systemStatus.executionMode}
                </div>
              </div>

              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-1">
                <div className="text-text-secondary">ML Fraud Detection Service</div>
                <div className="font-medium text-text-primary">{data.systemStatus.aiService}</div>
                <div className="text-text-secondary">
                  Flagged Alerts: {data.metrics.suspiciousAlertsCount}
                </div>
              </div>

              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-1">
                <div className="text-text-secondary">Sui Network Configuration</div>
                <div className="font-medium text-text-primary">
                  Network: {data.systemStatus.blockchain?.network} (RPC:{" "}
                  {data.systemStatus.blockchain?.rpcReachable ? "Connected" : "Local Mode"})
                </div>
                <div className="font-mono text-accent-cyan truncate">
                  Package: {data.systemStatus.blockchain?.packageId}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* User & Role Directory */}
          <div className="lg:col-span-6 rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
            <div className="p-6 border-b border-border-muted flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-text-primary">
                User Accounts ({data.metrics.totalUsers})
              </h2>
              <div className="text-xs text-text-secondary">
                Customers: {data.metrics.roleCounts.USER} • Organizers:{" "}
                {data.metrics.roleCounts.ORGANIZER} • Admins: {data.metrics.roleCounts.ADMIN}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                    <th className="p-4 font-medium">Name & Email</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Linked Wallet</th>
                    <th className="p-4 font-medium">Tickets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-muted">
                  {data.users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-bg-secondary/40">
                      <td className="p-4">
                        <div className="font-medium text-text-primary">{u.name}</div>
                        <div className="text-text-secondary">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <span className="rounded-lg bg-accent-violet/15 text-accent-violet px-2.5 py-0.5 font-medium">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-accent-cyan">
                        {u.wallets?.[0]?.walletAddress
                          ? `${u.wallets[0].walletAddress.slice(0, 8)}...`
                          : "Unlinked"}
                      </td>
                      <td className="p-4 font-medium text-text-primary">
                        {u._count?.ownedTickets || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-6 rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
            <div className="p-6 border-b border-border-muted flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-text-primary">
                Platform Transactions
              </h2>
              <span className="text-xs text-text-secondary">
                Local Demo vs. On-Chain
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                    <th className="p-4 font-medium">Operation</th>
                    <th className="p-4 font-medium">Buyer</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-muted">
                  {data.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-bg-secondary/40">
                      <td className="p-4 font-medium text-text-primary">
                        {tx.transactionType.replace("_", " ")}
                      </td>
                      <td className="p-4 text-text-secondary">{tx.buyer?.name}</td>
                      <td className="p-4 text-text-primary">{tx.amount} units</td>
                      <td className="p-4">
                        <span
                          className={`rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${
                            tx.isSimulated
                              ? "bg-bg-secondary border border-border-muted text-text-secondary"
                              : "bg-status-success/15 text-status-success"
                          }`}
                        >
                          {tx.isSimulated ? "Local Demo" : "On-Chain"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
