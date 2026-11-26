import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Ticket,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  MapPin,
  X,
  ArrowUpRight,
  Send,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EventArtwork } from "../components/EventArtwork";

export const MyTicketsPage: React.FC = () => {
  const { user, executionMode } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "USED" | "LISTED_FOR_RESALE"
  >("ALL");

  // Modal states for Resale Listing & Peer Transfer
  const [resaleModalTicket, setResaleModalTicket] = useState<any | null>(null);
  const [askingPrice, setAskingPrice] = useState<number>(1000);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [transferModalTicket, setTransferModalTicket] = useState<any | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMyTickets = () => {
    setLoading(true);
    apiRequest<{ tickets: any[] }>("/tickets/my")
      .then((res) => setTickets(res.tickets))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const filteredTickets = tickets.filter((t) =>
    statusFilter === "ALL" ? true : t.currentStatus === statusFilter
  );

  const handleCreateResaleListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resaleModalTicket) return;
    setActionError(null);
    try {
      await apiRequest("/resale/listings", {
        method: "POST",
        body: JSON.stringify({
          ticketId: resaleModalTicket.id,
          askingPrice: Number(askingPrice),
        }),
      });
      setActionSuccess(
        `Ticket #${resaleModalTicket.seatNumber} listed on the Marketplace at ${askingPrice} units (within the ${resaleModalTicket.maximumResalePrice} unit cap).`
      );
      setResaleModalTicket(null);
      fetchMyTickets();
    } catch (err: any) {
      setActionError(err.message || "Failed to list ticket for resale.");
    }
  };

  const handleTransferTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalTicket) return;
    setActionError(null);
    try {
      await apiRequest(`/tickets/${transferModalTicket.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          mode: executionMode,
        }),
      });
      setActionSuccess(
        `Ticket #${transferModalTicket.seatNumber} transferred to ${recipientEmail}.`
      );
      setTransferModalTicket(null);
      setRecipientEmail("");
      fetchMyTickets();
    } catch (err: any) {
      setActionError(err.message || "Failed to transfer ticket.");
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header & Filter Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border-muted">
        <div>
          <span className="text-xs font-medium text-accent-violet">
            Digital Ticket Wallet
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
            My Collectible Tickets
          </h1>
          <p className="text-sm text-text-secondary mt-1.5">
            View your NFT admission passes, present your QR code at the venue, or list eligible
            tickets within the fair resale cap.
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="inline-flex flex-wrap gap-1.5 rounded-xl bg-bg-secondary p-1.5 border border-border-muted">
          {(
            [
              { key: "ALL", label: "All Tickets" },
              { key: "ACTIVE", label: "Active" },
              { key: "USED", label: "Used" },
              { key: "LISTED_FOR_RESALE", label: "Listed for Resale" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-accent-violet text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-xl border border-status-success/40 bg-status-success/10 p-4 text-xs text-status-success flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-text-secondary hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-bg-card border border-border-muted h-80 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl bg-bg-card border border-border-muted p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-muted flex items-center justify-center text-accent-violet mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <div className="font-display text-lg font-bold text-text-primary">
            No tickets in this view
          </div>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Explore upcoming events to purchase an NFT pass or switch the status filter tab above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTickets.map((t) => {
            const latestTx = t.transactions?.[0];
            const isUsed = t.currentStatus === "USED";
            const isListed = t.currentStatus === "LISTED_FOR_RESALE";

            return (
              <div
                key={t.id}
                className={`rounded-2xl bg-bg-card border overflow-hidden flex flex-col justify-between shadow-card transition-all ${
                  isUsed
                    ? "border-border-muted/60 opacity-85"
                    : isListed
                    ? "border-status-warning/40"
                    : "border-border-muted hover:border-accent-violet/40"
                }`}
              >
                {/* Collectible Artwork Header */}
                <div className="relative">
                  <EventArtwork
                    category={t.event?.category || "ELECTRONIC"}
                    title={t.event?.name || "Event Pass"}
                    className="w-full h-36"
                  />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-lg bg-bg-primary/85 backdrop-blur-md border border-border-muted px-3 py-1 text-xs">
                    <span className="font-display font-bold text-text-primary">
                      {t.seatNumber}
                    </span>
                    <span className="text-text-secondary">• {t.tierName}</span>
                  </div>

                  <div
                    className={`absolute top-3 right-3 rounded-lg px-3 py-1 text-xs font-medium border ${
                      t.currentStatus === "ACTIVE"
                        ? "bg-status-success/15 text-status-success border-status-success/30"
                        : isListed
                        ? "bg-status-warning/15 text-status-warning border-status-warning/30"
                        : "bg-bg-primary/85 text-text-secondary border-border-muted"
                    }`}
                  >
                    {t.currentStatus === "ACTIVE"
                      ? "Active Pass"
                      : isListed
                      ? "Listed for Resale"
                      : "Used at Gate"}
                  </div>
                </div>

                {/* Main Ticket Content + QR Admission Pass */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  <div className="sm:col-span-7 space-y-3">
                    <h2 className="font-display font-bold text-lg text-text-primary leading-snug">
                      {t.event?.name}
                    </h2>

                    <div className="space-y-1.5 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                        <span>
                          {t.event?.startDate
                            ? new Date(t.event.startDate).toLocaleString()
                            : "TBA"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                        <span className="truncate">{t.event?.venue}</span>
                      </div>
                    </div>

                    {/* Price & Fair Cap Box */}
                    <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-bg-secondary border border-border-muted p-3">
                      <div>
                        <div className="text-[11px] text-text-secondary">Original Price</div>
                        <div className="font-display font-bold text-sm text-text-primary">
                          {t.originalPrice} units
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-text-secondary">Max Resale Cap</div>
                        <div className="font-display font-bold text-sm text-accent-cyan">
                          {t.maximumResalePrice} units
                        </div>
                      </div>
                    </div>

                    {/* Technical Metadata in JetBrains Mono */}
                    <div className="space-y-1 text-[11px] text-text-secondary pt-1">
                      <div className="flex items-center justify-between">
                        <span>Ticket ID:</span>
                        <span className="font-mono text-text-primary">
                          {t.id.slice(0, 8)}...{t.id.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>NFT Object:</span>
                        <span className="font-mono text-accent-cyan">
                          {t.nftObjectId
                            ? `${t.nftObjectId.slice(0, 8)}...${t.nftObjectId.slice(-4)}`
                            : "Demo Pass"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: QR Admission Code */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center rounded-xl bg-bg-secondary border border-border-muted p-4">
                    <div className="rounded-xl bg-text-primary p-2.5 shadow-sm">
                      <QRCodeSVG value={t.qrPayload || t.id} size={112} level="M" />
                    </div>
                    <div className="text-xs font-medium text-text-primary mt-2.5">
                      Venue QR Pass
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(t.id, t.qrPayload || t.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent-cyan hover:underline"
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check className="w-3 h-3" /> Copied Code
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy QR Reference
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Perforated Footer with Ownership & Actions */}
                <div className="ticket-perforation bg-bg-secondary/60 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-text-secondary">
                    Owner:{" "}
                    <span className="text-text-primary font-medium">
                      {t.currentOwner?.name || user?.name}
                    </span>
                    {latestTx?.transactionDigest && (
                      <span className="font-mono text-accent-cyan ml-2">
                        • Tx: {latestTx.transactionDigest.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {t.currentStatus === "ACTIVE" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setResaleModalTicket(t);
                          setAskingPrice(t.originalPrice);
                        }}
                        className="rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary text-xs font-medium px-3.5 py-2 transition-colors"
                      >
                        List for Resale
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setTransferModalTicket(t);
                        }}
                        className="rounded-xl bg-bg-elevated hover:bg-bg-card border border-border-muted text-text-primary text-xs font-medium px-3.5 py-2 transition-colors"
                      >
                        Transfer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resale Modal Enforcing Cap */}
      {resaleModalTicket && (
        <div className="fixed inset-0 z-50 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-bg-card border border-border-muted p-6 space-y-5 shadow-card">
            <div className="flex items-center justify-between border-b border-border-muted pb-3">
              <h3 className="font-display font-bold text-lg text-text-primary">
                Resell Ticket on Marketplace
              </h3>
              <button
                type="button"
                onClick={() => setResaleModalTicket(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Event</span>
                <span className="font-medium text-text-primary">
                  {resaleModalTicket.event?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Original Price</span>
                <span className="font-medium text-text-primary">
                  {resaleModalTicket.originalPrice} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Maximum Permitted Resale</span>
                <span className="font-bold text-accent-cyan">
                  {resaleModalTicket.maximumResalePrice} units
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateResaleListing} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Resale Price (units)
                </label>
                <input
                  type="number"
                  min={1}
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:border-accent-violet"
                  required
                />
                <p className="text-[11px] text-text-secondary mt-1.5">
                  Smart-contract rules enforce a maximum resale price of{" "}
                  <strong className="text-accent-cyan">
                    {resaleModalTicket.maximumResalePrice} units
                  </strong>
                  . Any listing above this limit will be rejected.
                </p>
              </div>

              {actionError && (
                <div className="rounded-xl border border-status-error/40 bg-status-error/10 p-3.5 text-xs text-status-error">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResaleModalTicket(null)}
                  className="rounded-xl border border-border-muted bg-bg-secondary px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium px-4 py-2 text-xs transition-colors"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Peer Transfer Modal */}
      {transferModalTicket && (
        <div className="fixed inset-0 z-50 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-bg-card border border-border-muted p-6 space-y-5 shadow-card">
            <div className="flex items-center justify-between border-b border-border-muted pb-3">
              <h3 className="font-display font-bold text-lg text-text-primary">
                Transfer Ticket Ownership
              </h3>
              <button
                type="button"
                onClick={() => setTransferModalTicket(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTransferTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Recipient Account Email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                  required
                />
              </div>

              {actionError && (
                <div className="rounded-xl border border-status-error/40 bg-status-error/10 p-3.5 text-xs text-status-error">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalTicket(null)}
                  className="rounded-xl border border-border-muted bg-bg-secondary px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium px-4 py-2 text-xs transition-colors"
                >
                  Transfer Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
