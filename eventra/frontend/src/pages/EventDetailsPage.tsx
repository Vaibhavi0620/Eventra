import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  ArrowLeft,
  Ticket,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EventArtwork } from "../components/EventArtwork";
import { EventImageEditor } from "../components/EventImageEditor";

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, executionMode, setExecutionMode, connectedWallet } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [tierName, setTierName] = useState("General Admission");
  const [suiDigestInput, setSuiDigestInput] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<any | null>(null);

  const loadEvent = () => {
    if (!id) return;
    setLoading(true);
    apiRequest<{ event: any; networkInfo: any }>(`/events/${id}`)
      .then((res) => {
        setEvent(res.event);
        setNetworkInfo(res.networkInfo);
      })
      .catch((err) => setError(err.message || "Failed to load event details"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth", { state: { from: `/events/${id}` } });
      return;
    }

    setPurchaseError(null);
    setPurchaseResult(null);
    setPurchasing(true);

    try {
      const payload: any = {
        eventId: event.id,
        quantity,
        tierName,
        mode: executionMode,
      };
      if (executionMode === "SUI_TESTNET" && suiDigestInput.trim()) {
        payload.suiTransactionDigest = suiDigestInput.trim();
      }

      const res = await apiRequest("/tickets/purchase", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPurchaseResult(res);
      loadEvent();
    } catch (err: any) {
      setPurchaseError(err.message || "Ticket purchase failed.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-sm text-text-secondary">
        Loading event details...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="rounded-2xl border border-status-error/40 bg-status-error/10 p-6 text-sm text-status-error">
          <strong>Error:</strong> {error || "Event not found."}
        </div>
      </div>
    );
  }

  const totalPrice = event.originalPrice * quantity;
  const markupPercentage = Math.round(
    ((event.resaleCap - event.originalPrice) / event.originalPrice) * 100
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All events
      </Link>

      {/* Editorial header: photo, oversized title, plain info rows */}
      <section className="space-y-8">
        <div className="relative group">
          <EventArtwork
            category={event.category}
            title={event.name}
            imageUrl={event.imageUrl}
            className="w-full h-[42vh] sm:h-[56vh]"
          />
          <div className="absolute top-4 left-4 text-[11px] uppercase tracking-[0.25em] text-text-primary bg-bg-primary/70 px-3 py-1.5">
            {event.category.replace("_", " ")} / {event.status}
          </div>
          <EventImageEditor
            eventId={event.id}
            organizerId={event.organizerId}
            onChanged={(updated) => setEvent((prev: any) => ({ ...prev, imageUrl: updated.imageUrl }))}
            className="absolute bottom-4 right-4"
          />
        </div>

        <h1 className="font-display uppercase text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] text-text-primary">
          {event.name}
        </h1>

        <dl className="grid grid-cols-1 sm:grid-cols-3 border-y border-border-muted divide-y sm:divide-y-0 sm:divide-x divide-border-muted">
          <div className="py-5 sm:pr-6">
            <dt className="text-[11px] uppercase tracking-[0.25em] text-text-secondary">Date</dt>
            <dd className="mt-1.5 text-text-primary">
              {new Date(event.startDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </dd>
          </div>
          <div className="py-5 sm:px-6">
            <dt className="text-[11px] uppercase tracking-[0.25em] text-text-secondary">Time</dt>
            <dd className="mt-1.5 text-text-primary">
              {new Date(event.startDate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </dd>
          </div>
          <div className="py-5 sm:pl-6">
            <dt className="text-[11px] uppercase tracking-[0.25em] text-text-secondary">Venue</dt>
            <dd className="mt-1.5 text-text-primary">{event.venue}</dd>
          </div>
        </dl>

        <div className="max-w-2xl">
          <h2 className="text-2xl text-text-secondary">About</h2>
          <p className="mt-3 text-text-primary/90 leading-relaxed">{event.description}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Event Information & On-Chain Rules */}
        <div className="lg:col-span-7 space-y-6">
          {/* Fair Ticketing & On-Chain Protections */}
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border-muted">
              <div>
                <h2 className="font-display font-bold text-lg text-text-primary">
                  On-Chain Anti-Scalping Protection
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Smart-contract rules embedded directly into every minted NFT pass
                </p>
              </div>
              <span className="font-mono text-xs rounded-lg bg-bg-secondary border border-border-muted text-accent-cyan px-3 py-1">
                eventra::ticket_nft
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4">
                <div className="text-xs text-text-secondary">Original Face Price</div>
                <div className="font-display text-xl font-bold text-text-primary mt-1">
                  {event.originalPrice} units
                </div>
                <div className="text-xs text-text-secondary mt-0.5">Primary Release</div>
              </div>

              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4">
                <div className="text-xs text-text-secondary">Max Permitted Resale</div>
                <div className="font-display text-xl font-bold text-accent-cyan mt-1">
                  {event.resaleCap} units
                </div>
                <div className="text-xs text-status-success mt-0.5">
                  +{markupPercentage}% Fair Cap Ceiling
                </div>
              </div>

              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4">
                <div className="text-xs text-text-secondary">Available Supply</div>
                <div className="font-display text-xl font-bold text-text-primary mt-1">
                  {event.ticketsAvailable} / {event.totalTickets}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">Verified Inventory</div>
              </div>
            </div>

            <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 text-xs text-text-secondary space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Sui Network:</span>
                <span className="font-mono text-text-primary">
                  {networkInfo?.suiNetwork || "testnet"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="shrink-0">Move Package ID:</span>
                <span className="font-mono text-accent-cyan truncate">
                  {networkInfo?.suiPackageId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Ticket Purchase & Minting Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 sm:p-8 shadow-card">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-accent-violet/15 text-accent-violet text-xs font-medium px-3 py-1 mb-3">
              <Ticket className="w-3.5 h-3.5" />
              Primary NFT Ticket Release
            </div>
            <h2 className="font-display text-2xl font-bold text-text-primary">Get Your Tickets</h2>
            <p className="text-xs text-text-secondary mt-1 mb-6">
              Select your ticket tier and quantity. Every purchase is protected by on-chain price
              limits and real-time AI bot detection.
            </p>

            {/* Execution Mode Selector */}
            <div className="mb-6 rounded-xl bg-bg-secondary border border-border-muted p-3.5 space-y-2">
              <div className="text-xs font-medium text-text-secondary">Execution Mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExecutionMode("LOCAL_DEMO");
                    setPurchaseError(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    executionMode === "LOCAL_DEMO"
                      ? "bg-accent-violet text-text-primary"
                      : "bg-bg-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Demo Mode (Simulated)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExecutionMode("SUI_TESTNET");
                    setPurchaseError(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    executionMode === "SUI_TESTNET"
                      ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                      : "bg-bg-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Sui Testnet (On-Chain)
                </button>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {executionMode === "LOCAL_DEMO"
                  ? "Instant demo mode: Mints a local ticket pass in PostgreSQL for immediate testing."
                  : "On-chain mode: Verifies a real signed Sui Testnet transaction digest via RPC."}
              </p>
            </div>

            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label
                  htmlFor="ticket-tier"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Ticket Tier
                </label>
                <select
                  id="ticket-tier"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                >
                  <option value="General Admission">
                    General Admission — {event.originalPrice} units (Cap: {event.resaleCap})
                  </option>
                  <option value="Quadraphonic Floor">
                    Quadraphonic Floor — {event.originalPrice} units (Cap: {event.resaleCap})
                  </option>
                  <option value="Balcony Acoustic">
                    Balcony Acoustic — {event.originalPrice} units (Cap: {event.resaleCap})
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="ticket-qty"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Ticket Quantity (Max 10 per order)
                </label>
                <input
                  id="ticket-qty"
                  type="number"
                  min={1}
                  max={Math.min(10, event.ticketsAvailable || 1)}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                />
                {quantity >= 4 && (
                  <p className="text-xs text-status-warning mt-1.5">
                    Buying 4 or more tickets in one order will be evaluated by the AI Fraud
                    Detection service for potential bulk-buying activity.
                  </p>
                )}
              </div>

              {executionMode === "SUI_TESTNET" && (
                <div className="rounded-xl border border-border-muted bg-bg-secondary p-4 space-y-2">
                  <label className="block text-xs font-medium text-text-primary">
                    Signed Sui Testnet Transaction Digest
                  </label>
                  <input
                    type="text"
                    value={suiDigestInput}
                    onChange={(e) => setSuiDigestInput(e.target.value)}
                    placeholder="Enter Sui Testnet digest (e.g. 5Vv8...)"
                    className="w-full rounded-lg border border-border-muted bg-bg-card px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan"
                  />
                  <div className="text-[11px] text-text-secondary">
                    Connected Wallet:{" "}
                    <span className="font-mono text-accent-cyan">
                      {connectedWallet ? connectedWallet : "Not connected"}
                    </span>
                  </div>
                </div>
              )}

              {/* Price Calculation Breakdown */}
              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Ticket Price</span>
                  <span>{event.originalPrice} units</span>
                </div>
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Quantity</span>
                  <span>× {quantity}</span>
                </div>
                <div className="flex justify-between border-t border-border-muted pt-2.5 font-display font-bold text-base text-text-primary">
                  <span>Total</span>
                  <span>{totalPrice} units</span>
                </div>
                <div className="flex justify-between text-xs text-accent-cyan pt-1">
                  <span>Maximum Resale Price per Ticket</span>
                  <span>≤ {event.resaleCap} units</span>
                </div>
              </div>

              {purchaseError && (
                <div
                  role="alert"
                  className="rounded-xl border border-status-error/40 bg-status-error/10 p-4 text-xs text-status-error space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Purchase could not be completed</div>
                      <p className="mt-1 text-text-primary/90">{purchaseError}</p>
                    </div>
                  </div>
                  {executionMode === "SUI_TESTNET" && (
                    <button
                      type="button"
                      onClick={() => {
                        setExecutionMode("LOCAL_DEMO");
                        setPurchaseError(null);
                      }}
                      className="w-full rounded-lg bg-bg-elevated hover:bg-accent-violet text-text-primary font-medium py-2 text-xs transition-colors"
                    >
                      Switch to Demo Mode
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={purchasing || event.ticketsAvailable < 1}
                className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-sm py-3.5 px-6 transition-colors disabled:opacity-50 shadow-sm"
              >
                {event.ticketsAvailable < 1
                  ? "Sold Out"
                  : purchasing
                  ? "Minting NFT Ticket..."
                  : executionMode === "SUI_TESTNET"
                  ? "Verify On-Chain & Mint Ticket"
                  : "Buy Ticket Now"}
              </button>
            </form>
          </div>

          {/* Purchase Confirmation & Ownership Receipt */}
          {purchaseResult && (
            <div className="rounded-2xl bg-bg-card border border-status-success/40 p-6 space-y-4 shadow-card">
              <div className="flex items-center justify-between border-b border-border-muted pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-status-success/15 text-status-success px-2.5 py-1 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {purchaseResult.isSimulated ? "Demo Pass Minted" : "On-Chain Pass Minted"}
                </span>
                <span className="text-xs text-text-secondary">
                  {purchaseResult.tickets.length} Ticket(s) Issued
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary">
                <div>
                  <strong className="text-text-primary">Owner:</strong> {user?.name} ({user?.email})
                </div>
                <div>
                  <strong className="text-text-primary">Mode:</strong> {purchaseResult.executionMode}
                </div>
                <div className="break-all">
                  <strong className="text-text-primary">Transaction Digest:</strong>{" "}
                  <span className="font-mono text-accent-cyan">
                    {purchaseResult.transactions[0]?.transactionDigest ||
                      "Simulated Local Record"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-bg-secondary border border-border-muted p-3.5 space-y-1.5 text-xs">
                <div className="font-medium text-text-primary flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-accent-violet" />
                  AI Fraud Detection Check
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">Status:</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      purchaseResult.aiAnalysis.predictedLabel === "SUSPICIOUS"
                        ? "bg-status-warning/15 text-status-warning"
                        : "bg-status-success/15 text-status-success"
                    }`}
                  >
                    {purchaseResult.aiAnalysis.predictedLabel}
                  </span>
                  <span className="text-text-secondary">
                    (Risk Score: {purchaseResult.aiAnalysis.riskScore})
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary">
                  {purchaseResult.aiAnalysis.reasons.join(" • ")}
                </div>
              </div>

              <Link
                to="/my-tickets"
                className="block text-center rounded-xl bg-bg-elevated hover:bg-accent-violet border border-border-muted text-text-primary font-medium text-xs py-3 transition-colors"
              >
                View in My Tickets →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
