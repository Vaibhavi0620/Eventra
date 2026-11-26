import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertTriangle, CheckCircle2, MapPin, Ticket } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EventArtwork } from "../components/EventArtwork";

export const ResaleMarketplacePage: React.FC = () => {
  const { user, executionMode } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState<any[]>([]);
  const [myActiveTickets, setMyActiveTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [askingPrice, setAskingPrice] = useState<number>(1100);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ listings: any[] }>("/resale/listings?status=ALL");
      setListings(res.listings);
      if (user) {
        const myRes = await apiRequest<{ tickets: any[] }>("/tickets/my?status=ACTIVE");
        setMyActiveTickets(myRes.tickets);
        if (myRes.tickets.length > 0 && !selectedTicketId) {
          setSelectedTicketId(myRes.tickets[0].id);
          setAskingPrice(myRes.tickets[0].originalPrice);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplace();
  }, [user]);

  const selectedTicket = myActiveTickets.find((t) => t.id === selectedTicketId);

  const handleListTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!selectedTicketId) {
      setFormError("Please select an eligible active ticket to list.");
      return;
    }

    try {
      await apiRequest("/resale/listings", {
        method: "POST",
        body: JSON.stringify({
          ticketId: selectedTicketId,
          askingPrice: Number(askingPrice),
        }),
      });
      setFormSuccess(
        `Listing published at ${askingPrice} units (verified within the ${selectedTicket?.maximumResalePrice} unit maximum resale cap).`
      );
      fetchMarketplace();
    } catch (err: any) {
      setFormError(err.message || "Resale listing rejected.");
    }
  };

  const handlePurchaseListing = async (listing: any) => {
    if (!user) {
      navigate("/auth", { state: { from: "/resale" } });
      return;
    }
    setFormError(null);
    setFormSuccess(null);

    try {
      await apiRequest(`/resale/listings/${listing.id}/purchase`, {
        method: "POST",
        body: JSON.stringify({
          mode: executionMode,
        }),
      });
      setFormSuccess(
        `Purchased Ticket #${listing.ticket.seatNumber} for ${listing.askingPrice} units! Ownership has been transferred to your wallet.`
      );
      fetchMarketplace();
    } catch (err: any) {
      setFormError(err.message || "Resale purchase failed.");
    }
  };

  const handleCancelListing = async (listingId: string) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiRequest(`/resale/listings/${listingId}`, { method: "DELETE" });
      setFormSuccess("Listing cancelled and ticket returned to Active status.");
      fetchMarketplace();
    } catch (err: any) {
      setFormError(err.message || "Failed to cancel listing.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border-muted">
        <div>
          <span className="text-xs font-medium text-accent-violet">
            Price-Capped Fan-to-Fan Marketplace
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
            Resale, Without the Rip-Off.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1.5 max-w-2xl">
            Every resale listing is validated against the event&apos;s on-chain maximum resale price
            cap so real fans never pay scalper markups.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-bg-card border border-border-muted px-4 py-2.5 text-xs text-status-success">
          <ShieldCheck className="w-4 h-4" />
          <span>On-Chain Price Cap Enforced</span>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-2xl border border-status-error/40 bg-status-error/10 p-4 text-xs text-status-error flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Price Cap Protection Triggered:</strong> {formError}
          </div>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-2xl border border-status-success/40 bg-status-success/10 p-4 text-xs text-status-success flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormSuccess(null)}
            className="text-text-secondary hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 Columns: List Eligible Ticket */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-5 shadow-card">
            <div>
              <span className="text-xs font-medium text-accent-violet">Sell Your Ticket</span>
              <h2 className="font-display text-xl font-bold text-text-primary mt-0.5">
                List a Ticket for Resale
              </h2>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Select an active ticket from your wallet. Listings above the configured maximum
                resale price are automatically blocked.
              </p>
            </div>

            {!user ? (
              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 text-xs text-text-secondary">
                Sign in to list your active tickets on the Marketplace.
              </div>
            ) : myActiveTickets.length === 0 ? (
              <div className="rounded-xl bg-bg-secondary border border-border-muted p-4 text-xs text-text-secondary">
                You don&apos;t have any un-listed active tickets right now. Purchase a ticket from
                Explore Events first.
              </div>
            ) : (
              <form onSubmit={handleListTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Select Active Ticket
                  </label>
                  <select
                    value={selectedTicketId}
                    onChange={(e) => {
                      setSelectedTicketId(e.target.value);
                      const found = myActiveTickets.find((x) => x.id === e.target.value);
                      if (found) setAskingPrice(found.originalPrice);
                    }}
                    className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-violet"
                  >
                    {myActiveTickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.seatNumber} — {t.event?.name.slice(0, 28)} (Cap: {t.maximumResalePrice})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTicket && (
                  <div className="rounded-xl bg-bg-secondary border border-border-muted p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Original Price</span>
                      <span className="font-medium text-text-primary">
                        {selectedTicket.originalPrice} units
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Max Permitted Resale</span>
                      <span className="font-bold text-accent-cyan">
                        {selectedTicket.maximumResalePrice} units
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Your Listing Price (units)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm font-medium text-text-primary focus:outline-none focus:border-accent-violet"
                    required
                  />
                  {selectedTicket && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <button
                        type="button"
                        onClick={() => setAskingPrice(selectedTicket.originalPrice + 100)}
                        className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Fair Price ({selectedTicket.originalPrice + 100})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAskingPrice(selectedTicket.maximumResalePrice)}
                        className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2.5 py-1 text-[11px] text-accent-cyan transition-colors"
                      >
                        At Cap ({selectedTicket.maximumResalePrice})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAskingPrice(selectedTicket.maximumResalePrice + 300)}
                        className="rounded-lg bg-status-error/10 hover:bg-status-error/20 border border-status-error/30 px-2.5 py-1 text-[11px] text-status-error transition-colors"
                      >
                        Test Over Cap ({selectedTicket.maximumResalePrice + 300})
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-sm py-3 transition-colors"
                >
                  Publish Resale Listing
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right 8 Columns: Verified Resale Listings */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-text-primary">
              Verified Fan Listings
            </h2>
            <span className="text-xs text-text-secondary">
              {listings.length} listing(s)
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-bg-card border border-border-muted h-44 animate-pulse"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl bg-bg-card border border-border-muted p-12 text-center text-sm text-text-secondary">
              No resale listings available right now.
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((item) => {
                const orig = item.ticket?.originalPrice || 1000;
                const cap = item.ticket?.maximumResalePrice || 1200;
                const markupPct = Math.round(((item.askingPrice - orig) / orig) * 100);
                const isSeller = user?.id === item.sellerId;
                const withinCap = item.askingPrice <= cap;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-bg-card border border-border-muted hover:border-accent-violet/40 overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all shadow-card"
                  >
                    {/* Artwork Thumbnail */}
                    <div className="md:col-span-3 relative">
                      <EventArtwork
                        category={item.ticket?.event?.category || "ELECTRONIC"}
                        title={item.ticket?.event?.name || "Event"}
                        className="w-full h-full min-h-[140px]"
                      />
                      <span
                        className={`absolute top-3 left-3 rounded-lg px-2.5 py-0.5 text-[11px] font-medium border ${
                          item.status === "ACTIVE"
                            ? "bg-status-success/15 text-status-success border-status-success/30"
                            : "bg-bg-primary/85 text-text-secondary border-border-muted"
                        }`}
                      >
                        {item.status === "ACTIVE" ? "Available" : item.status}
                      </span>
                    </div>

                    {/* Event & Ticket Details */}
                    <div className="md:col-span-5 p-5 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-accent-violet font-medium">
                          <span>Seat {item.ticket?.seatNumber}</span>
                          <span>•</span>
                          <span>{item.ticket?.tierName}</span>
                        </div>
                        <h3 className="font-display font-bold text-lg text-text-primary mt-1 leading-snug">
                          {item.ticket?.event?.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                          <span className="truncate">{item.ticket?.event?.venue}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>Seller: {item.seller?.name}</span>
                        {withinCap && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-status-success/10 text-status-success px-2 py-0.5 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Within Cap
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Comparison & Action */}
                    <div className="md:col-span-4 bg-bg-secondary/60 border-t md:border-t-0 md:border-l border-border-muted p-5 flex flex-col justify-between space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center rounded-xl bg-bg-card border border-border-muted p-2.5">
                        <div>
                          <div className="text-[10px] text-text-secondary">Original</div>
                          <div className="font-display font-bold text-xs text-text-primary mt-0.5">
                            {orig}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-secondary">Resale</div>
                          <div className="font-display font-bold text-sm text-accent-violet mt-0.5">
                            {item.askingPrice}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-secondary">Max Cap</div>
                          <div className="font-display font-bold text-xs text-accent-cyan mt-0.5">
                            {cap}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-text-secondary text-right">
                        {markupPct >= 0 ? `+${markupPct}%` : `${markupPct}%`} vs original • Max{" "}
                        {cap} units
                      </div>

                      {item.status === "ACTIVE" && (
                        <div>
                          {isSeller ? (
                            <button
                              type="button"
                              onClick={() => handleCancelListing(item.id)}
                              className="w-full rounded-xl bg-bg-elevated hover:bg-status-error/20 border border-border-muted text-text-primary text-xs font-medium py-2.5 transition-colors"
                            >
                              Cancel My Listing
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePurchaseListing(item)}
                              className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary text-xs font-medium py-2.5 transition-colors"
                            >
                              Buy Ticket ({item.askingPrice} units)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
