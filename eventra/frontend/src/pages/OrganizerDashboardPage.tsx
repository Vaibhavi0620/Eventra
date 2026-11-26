import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  ShieldAlert,
  Repeat,
  QrCode,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit3,
  Ticket,
  Layers,
  ExternalLink,
  Info,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type OrganizerSection =
  | "OVERVIEW"
  | "EVENTS"
  | "FRAUD"
  | "RESALE"
  | "ATTENDANCE"
  | "BLOCKCHAIN";

export const OrganizerDashboardPage: React.FC = () => {
  const { user, executionMode } = useAuth();
  const [activeTab, setActiveTab] = useState<OrganizerSection>("OVERVIEW");
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create / Edit Event Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("ELECTRONIC");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("2026-12-15T19:00");
  const [endDate, setEndDate] = useState("2026-12-15T23:00");
  const [totalTickets, setTotalTickets] = useState(150);
  const [originalPrice, setOriginalPrice] = useState(1000);
  const [resaleCap, setResaleCap] = useState(1200);

  // Quick QR Verification inside Attendance tab
  const [qrInput, setQrInput] = useState("");
  const [selectedGateEventId, setSelectedGateEventId] = useState("");
  const [scanOutcome, setScanOutcome] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    apiRequest("/admin/overview")
      .then((res: any) => {
        setOverview(res);
        if (res.events?.length > 0 && !selectedGateEventId) {
          setSelectedGateEventId(res.events[0].id);
        }
      })
      .catch((err) => setError(err.message || "Failed to load organizer dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingEventId) {
        await apiRequest(`/events/${editingEventId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            description,
            category,
            venue,
            totalTickets: Number(totalTickets),
            originalPrice: Number(originalPrice),
            resaleCap: Number(resaleCap),
          }),
        });
        setSuccessMsg(`Updated event "${name}" and its resale cap rules.`);
        setEditingEventId(null);
      } else {
        await apiRequest("/events", {
          method: "POST",
          body: JSON.stringify({
            name,
            description,
            category,
            venue,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            totalTickets: Number(totalTickets),
            originalPrice: Number(originalPrice),
            resaleCap: Number(resaleCap),
          }),
        });
        setSuccessMsg(
          `Created new event "${name}" with Original Price ${originalPrice} units and Max Resale Cap ${resaleCap} units.`
        );
      }
      setName("");
      setDescription("");
      setVenue("");
      loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to save event.");
    }
  };

  const populateForEdit = (ev: any) => {
    setEditingEventId(ev.id);
    setName(ev.name);
    setDescription(ev.description);
    setCategory(ev.category);
    setVenue(ev.venue);
    setTotalTickets(ev.totalTickets);
    setOriginalPrice(ev.originalPrice);
    setResaleCap(ev.resaleCap);
    setActiveTab("EVENTS");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReviewAlert = async (alertId: string, reviewStatus: string) => {
    try {
      await apiRequest(`/fraud/alerts/${alertId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ reviewStatus }),
      });
      setSuccessMsg(`Alert marked as ${reviewStatus.replace("_", " ")}.`);
      loadDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to update alert status.");
    }
  };

  const handleInlineVerifyQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setScanning(true);
    setScanOutcome(null);
    setError(null);
    try {
      const res = await apiRequest("/verification/scan", {
        method: "POST",
        body: JSON.stringify({
          qrPayload: qrInput.trim(),
          eventId: selectedGateEventId || undefined,
          mode: executionMode,
        }),
      });
      setScanOutcome(res);
      loadDashboard();
    } catch (err: any) {
      if (err.data && err.data.verificationResult) {
        setScanOutcome(err.data);
        loadDashboard();
      } else {
        setError(err.message || "QR verification failed.");
      }
    } finally {
      setScanning(false);
    }
  };

  const navItems: { id: OrganizerSection; label: string; icon: React.ReactNode }[] = [
    { id: "OVERVIEW", label: "1. Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "EVENTS", label: "2. Event Management", icon: <Calendar className="w-4 h-4" /> },
    { id: "FRAUD", label: "3. AI Fraud Monitoring", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "RESALE", label: "4. Resale Monitoring", icon: <Repeat className="w-4 h-4" /> },
    {
      id: "ATTENDANCE",
      label: "5. Attendance & Verification",
      icon: <QrCode className="w-4 h-4" />,
    },
    { id: "BLOCKCHAIN", label: "6. Blockchain Activity", icon: <Layers className="w-4 h-4" /> },
  ];

  const metrics = overview?.metrics || {
    totalEvents: 0,
    totalCapacity: 0,
    totalTicketsRemaining: 0,
    totalTicketsSold: 0,
    totalTicketsIssued: 0,
    ticketsUsed: 0,
    activeResaleListings: 0,
    suspiciousAlertsCount: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border-muted">
        <div>
          <span className="text-xs font-medium text-accent-violet">
            Authorized Organizer Portal • {user?.name}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
            Organizer Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1.5">
            Manage your events, monitor ticket sales and price-capped resales, review AI fraud
            alerts, and verify venue attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded-xl bg-bg-card hover:bg-bg-elevated border border-border-muted px-4 py-2.5 text-xs font-medium text-text-primary transition-colors"
          >
            <QrCode className="w-4 h-4 text-accent-cyan" />
            Full-Screen QR Scanner
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingEventId(null);
              setActiveTab("EVENTS");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-violet hover:bg-accent-violetHover px-4 py-2.5 text-xs font-medium text-text-primary transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Section Navigation Bar */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-bg-secondary p-2 border border-border-muted">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-accent-violet text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Feedback Banners */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-status-error/40 bg-status-error/10 p-4 text-xs text-status-error flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-text-secondary hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-status-success/40 bg-status-success/10 p-4 text-xs text-status-success flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-text-secondary hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-bg-card border border-border-muted h-40 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* =========================================================
              1. OVERVIEW SECTION
             ========================================================= */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-8">
              {/* 6 Key Operational Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
                  <div className="text-xs text-text-secondary">Events Managed</div>
                  <div className="font-display text-3xl font-bold text-text-primary mt-2">
                    {metrics.totalEvents}
                  </div>
                  <div className="text-xs text-accent-cyan mt-1">
                    Active & upcoming events under your account
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
                  <div className="text-xs text-text-secondary">Tickets Issued & Remaining</div>
                  <div className="font-display text-3xl font-bold text-text-primary mt-2">
                    {metrics.totalTicketsIssued}{" "}
                    <span className="text-base font-normal text-text-secondary">
                      issued / {metrics.totalTicketsRemaining} left
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Total configured capacity: {metrics.totalCapacity}
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
                  <div className="text-xs text-text-secondary">Tickets Sold</div>
                  <div className="font-display text-3xl font-bold text-accent-violet mt-2">
                    {metrics.totalTicketsSold}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Primary NFT ticket sales completed
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
                  <div className="text-xs text-text-secondary">Verified Admissions</div>
                  <div className="font-display text-3xl font-bold text-status-success mt-2">
                    {metrics.ticketsUsed}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Checked in at the venue gate via QR
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
                  <div className="text-xs text-text-secondary">Active Resale Activity</div>
                  <div className="font-display text-3xl font-bold text-accent-cyan mt-2">
                    {metrics.activeResaleListings}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Listings currently active within price caps
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-6">
                  <div className="text-xs text-text-secondary">Important AI Alerts</div>
                  <div className="font-display text-3xl font-bold text-status-warning mt-2">
                    {metrics.suspiciousAlertsCount}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Suspected bot or bulk activity awaiting review
                  </div>
                </div>
              </div>

              {/* Quick Summary Panels: Managed Events + Important Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border-muted pb-3">
                    <h2 className="font-display font-bold text-lg text-text-primary">
                      Your Managed Events
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("EVENTS")}
                      className="text-xs text-accent-cyan hover:underline"
                    >
                      Manage Events →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {overview?.events?.map((ev: any) => {
                      const sold = ev.totalTickets - ev.ticketsAvailable;
                      const revenue = sold * ev.originalPrice;
                      return (
                        <div
                          key={ev.id}
                          className="rounded-xl bg-bg-secondary border border-border-muted p-4 flex flex-wrap items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="font-display font-bold text-sm text-text-primary">
                              {ev.name}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {ev.venue} • {new Date(ev.startDate).toLocaleDateString()}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs pt-1">
                              <span className="text-text-secondary">
                                Sold: <strong className="text-text-primary">{sold}</strong> /{" "}
                                {ev.totalTickets}
                              </span>
                              <span className="text-text-secondary">
                                Revenue:{" "}
                                <strong className="text-text-primary">
                                  {revenue.toLocaleString()} units
                                </strong>
                              </span>
                              <span className="text-accent-cyan">
                                Max Resale: {ev.resaleCap} units
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => populateForEdit(ev)}
                            className="rounded-xl bg-bg-card hover:bg-bg-elevated border border-border-muted px-3.5 py-2 text-xs font-medium text-text-primary transition-colors"
                          >
                            Edit Event
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border-muted pb-3">
                    <h2 className="font-display font-bold text-lg text-text-primary">
                      Important Alerts
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("FRAUD")}
                      className="text-xs text-accent-cyan hover:underline"
                    >
                      Review All Alerts →
                    </button>
                  </div>

                  {overview?.suspiciousAlerts?.length === 0 ? (
                    <div className="rounded-xl bg-bg-secondary border border-border-muted p-6 text-center text-xs text-text-secondary">
                      No suspected bot or scalping alerts flagged on your events.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overview?.suspiciousAlerts?.slice(0, 4).map((al: any) => (
                        <div
                          key={al.id}
                          className="rounded-xl bg-bg-secondary border border-status-warning/30 p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-status-warning/15 text-status-warning px-2 py-0.5 font-medium">
                              Suspected Activity • Risk {al.riskScore.toFixed(2)}
                            </span>
                            <span className="text-text-secondary">
                              {new Date(al.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="font-mono text-accent-cyan text-[11px] truncate">
                            Wallet: {al.walletAddress}
                          </div>
                          <div className="text-text-secondary">
                            {al.reasons?.join(" • ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              2. EVENT MANAGEMENT SECTION
             ========================================================= */}
          {activeTab === "EVENTS" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 5 Columns: Create & Edit Event Form */}
              <div className="lg:col-span-5 rounded-2xl bg-bg-card border border-border-muted p-6 space-y-5 shadow-card">
                <div className="flex items-center justify-between border-b border-border-muted pb-3">
                  <h2 className="font-display font-bold text-lg text-text-primary">
                    {editingEventId ? "Edit Event Configuration" : "Create New Event"}
                  </h2>
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setName("");
                        setDescription("");
                        setVenue("");
                      }}
                      className="text-xs text-accent-cyan hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-text-secondary mb-1.5">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Synthwave Pulse — Live Modular Session"
                      className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-text-secondary mb-1.5">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                      >
                        <option value="ELECTRONIC">Electronic</option>
                        <option value="INDIE_ROCK">Indie Rock</option>
                        <option value="CLASSICAL">Classical</option>
                        <option value="FESTIVAL">Festival</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-text-secondary mb-1.5">
                        Total Ticket Supply
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={totalTickets}
                        onChange={(e) => setTotalTickets(Number(e.target.value))}
                        className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-text-secondary mb-1.5">
                      Venue & City
                    </label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="Bikaner House Pavilion, New Delhi"
                      className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                      required
                    />
                  </div>

                  {!editingEventId && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-text-secondary mb-1.5">
                          Start Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-violet"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-text-secondary mb-1.5">
                          End Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-violet"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-bg-secondary border border-border-muted p-3.5">
                    <div>
                      <label className="block font-medium text-text-secondary mb-1">
                        Original Price (units)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={originalPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOriginalPrice(val);
                          setResaleCap(Math.floor(val * 1.2));
                        }}
                        className="w-full rounded-lg border border-border-muted bg-bg-card px-3 py-2 text-sm font-medium text-text-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-accent-cyan mb-1">
                        Max Resale Cap (units)
                      </label>
                      <input
                        type="number"
                        min={originalPrice}
                        value={resaleCap}
                        onChange={(e) => setResaleCap(Number(e.target.value))}
                        className="w-full rounded-lg border border-accent-cyan/40 bg-bg-card px-3 py-2 text-sm font-medium text-accent-cyan"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-text-secondary mb-1.5">
                      Event Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the live experience, line-up, and entry guidelines..."
                      className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-sm py-3 transition-colors"
                  >
                    {editingEventId ? "Save Event Changes" : "Publish Event"}
                  </button>
                </form>
              </div>

              {/* Right 7 Columns: Event Sales, Categories & Availability */}
              <div className="lg:col-span-7 space-y-4">
                <h2 className="font-display font-bold text-xl text-text-primary">
                  Event Inventory, Categories & Sales Monitoring
                </h2>

                {overview?.events?.map((ev: any) => {
                  const sold = ev.totalTickets - ev.ticketsAvailable;
                  const revenue = sold * ev.originalPrice;
                  const pctSold = Math.round((sold / Math.max(1, ev.totalTickets)) * 100);

                  return (
                    <div
                      key={ev.id}
                      className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="rounded-md bg-accent-violet/15 text-accent-violet px-2.5 py-0.5 font-medium">
                              {ev.category}
                            </span>
                            <span className="rounded-md bg-status-success/15 text-status-success px-2.5 py-0.5 font-medium">
                              {ev.status}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-lg text-text-primary mt-2">
                            {ev.name}
                          </h3>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {ev.venue} • {new Date(ev.startDate).toLocaleString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => populateForEdit(ev)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-3.5 py-2 text-xs font-medium text-text-primary transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-accent-violet" />
                          Edit Details
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                          <div className="text-text-secondary">Tickets Sold</div>
                          <div className="font-display font-bold text-base text-text-primary mt-0.5">
                            {sold} / {ev.totalTickets} ({pctSold}%)
                          </div>
                        </div>
                        <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                          <div className="text-text-secondary">Remaining</div>
                          <div className="font-display font-bold text-base text-text-primary mt-0.5">
                            {ev.ticketsAvailable}
                          </div>
                        </div>
                        <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                          <div className="text-text-secondary">Primary Revenue</div>
                          <div className="font-display font-bold text-base text-status-success mt-0.5">
                            {revenue.toLocaleString()} units
                          </div>
                        </div>
                        <div className="rounded-xl bg-bg-secondary border border-border-muted p-3">
                          <div className="text-text-secondary">Price / Cap</div>
                          <div className="font-display font-bold text-base text-accent-cyan mt-0.5">
                            {ev.originalPrice} / {ev.resaleCap}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              3. AI FRAUD MONITORING SECTION
             ========================================================= */}
          {activeTab === "FRAUD" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-bg-secondary border border-border-muted p-5 flex items-start gap-3.5">
                <Info className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-text-secondary leading-relaxed">
                  <div className="font-semibold text-text-primary">
                    Suspected Activity vs. Confirmed Fraud
                  </div>
                  <p>
                    The machine-learning model evaluates transaction velocity, ticket quantity,
                    transfer counts, and resale price ratios to flag{" "}
                    <strong className="text-status-warning">Suspected Activity</strong> for
                    organizer review. A model flag is an advisory indicator, whereas resale price
                    caps and one-time QR usage are enforced directly by smart-contract rules.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
                <div className="p-6 border-b border-border-muted flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-text-primary">
                      ML-Evaluated Ticket Transactions
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Review flagged transactions and mark alerts as Reviewed, Restricted, or
                      Dismissed
                    </p>
                  </div>
                  <Link
                    to="/fraud"
                    className="text-xs font-medium text-accent-cyan hover:underline"
                  >
                    Open Interactive ML Sandbox →
                  </Link>
                </div>

                {!overview?.allAlerts || overview.allAlerts.length === 0 ? (
                  <div className="p-10 text-center text-sm text-text-secondary">
                    No transaction evaluations recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                          <th className="p-4 font-medium">Timestamp & Event</th>
                          <th className="p-4 font-medium">Wallet / Buyer</th>
                          <th className="p-4 font-medium">Model Classification</th>
                          <th className="p-4 font-medium">Reasons Provided by Model</th>
                          <th className="p-4 font-medium">Organizer Review Status</th>
                          <th className="p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-muted">
                        {overview.allAlerts.map((al: any) => {
                          const isSuspicious = al.predictedLabel === "SUSPICIOUS";
                          return (
                            <tr key={al.id} className="hover:bg-bg-secondary/40">
                              <td className="p-4 align-top">
                                <div className="font-medium text-text-primary">
                                  {al.transaction?.ticket?.event?.name || "Event"}
                                </div>
                                <div className="text-text-secondary mt-0.5">
                                  {new Date(al.createdAt).toLocaleString()}
                                </div>
                              </td>
                              <td className="p-4 align-top">
                                <div className="font-mono text-accent-cyan">
                                  {al.walletAddress}
                                </div>
                                {al.transaction?.buyer && (
                                  <div className="text-text-secondary mt-0.5">
                                    {al.transaction.buyer.name}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 align-top">
                                <span
                                  className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                                    isSuspicious
                                      ? "bg-status-error/15 text-status-error border border-status-error/30"
                                      : "bg-status-success/15 text-status-success border border-status-success/30"
                                  }`}
                                >
                                  {isSuspicious ? "Suspected Activity" : "Normal Activity"}
                                </span>
                                <div className="text-text-secondary mt-1.5">
                                  Risk Score:{" "}
                                  <strong className="text-text-primary">
                                    {typeof al.riskScore === "number"
                                      ? al.riskScore.toFixed(3)
                                      : "N/A"}
                                  </strong>
                                </div>
                              </td>
                              <td className="p-4 align-top max-w-xs">
                                <ul className="space-y-1 text-text-secondary">
                                  {al.reasons?.map((r: string, i: number) => (
                                    <li key={i}>• {r}</li>
                                  ))}
                                </ul>
                              </td>
                              <td className="p-4 align-top">
                                <span
                                  className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                                    al.reviewStatus === "PENDING_REVIEW"
                                      ? "bg-status-warning/15 text-status-warning"
                                      : al.reviewStatus === "RESTRICTED"
                                      ? "bg-status-error/15 text-status-error"
                                      : "bg-bg-secondary text-text-secondary"
                                  }`}
                                >
                                  {al.reviewStatus.replace("_", " ")}
                                </span>
                              </td>
                              <td className="p-4 align-top">
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleReviewAlert(al.id, "ACKNOWLEDGED")}
                                    className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2.5 py-1 text-[11px] text-text-primary transition-colors"
                                  >
                                    Mark Reviewed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewAlert(al.id, "RESTRICTED")}
                                    className="rounded-lg bg-status-error/15 hover:bg-status-error/25 border border-status-error/30 px-2.5 py-1 text-[11px] text-status-error transition-colors"
                                  >
                                    Confirm & Restrict
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewAlert(al.id, "DISMISSED")}
                                    className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2.5 py-1 text-[11px] text-text-secondary transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              4. RESALE MONITORING SECTION
             ========================================================= */}
          {activeTab === "RESALE" && (
            <div className="rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
              <div className="p-6 border-b border-border-muted flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-text-primary">
                    Secondary Resale Cap Monitoring
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Compare original ticket prices, listed resale prices, and smart-contract maximum
                    resale caps across your events
                  </p>
                </div>
              </div>

              {!overview?.resaleListings || overview.resaleListings.length === 0 ? (
                <div className="p-10 text-center text-sm text-text-secondary">
                  No resale listings recorded for your events yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                        <th className="p-4 font-medium">Event & Seat</th>
                        <th className="p-4 font-medium">Seller</th>
                        <th className="p-4 font-medium">Original Price</th>
                        <th className="p-4 font-medium">Listed Resale Price</th>
                        <th className="p-4 font-medium">Configured Max Cap</th>
                        <th className="p-4 font-medium">Rule Validation</th>
                        <th className="p-4 font-medium">Listing Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-muted">
                      {overview.resaleListings.map((lst: any) => {
                        const orig = lst.ticket?.originalPrice || 1000;
                        const cap = lst.ticket?.maximumResalePrice || 1200;
                        const violatesCap = lst.askingPrice > cap;
                        return (
                          <tr key={lst.id} className="hover:bg-bg-secondary/40">
                            <td className="p-4">
                              <div className="font-medium text-text-primary">
                                {lst.ticket?.event?.name}
                              </div>
                              <div className="text-text-secondary mt-0.5">
                                Seat {lst.ticket?.seatNumber} • {lst.ticket?.tierName}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-text-primary">{lst.seller?.name}</div>
                              <div className="text-text-secondary">{lst.seller?.email}</div>
                            </td>
                            <td className="p-4 font-medium text-text-primary">{orig} units</td>
                            <td className="p-4 font-display font-bold text-sm text-accent-violet">
                              {lst.askingPrice} units
                            </td>
                            <td className="p-4 font-medium text-accent-cyan">{cap} units</td>
                            <td className="p-4">
                              {violatesCap ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-status-error/15 text-status-error border border-status-error/30 px-2.5 py-1 font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Violates Cap
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-status-success/15 text-status-success border border-status-success/30 px-2.5 py-1 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Compliant (≤ Cap)
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="rounded-lg bg-bg-secondary border border-border-muted px-2.5 py-1 text-text-primary">
                                {lst.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              5. ATTENDANCE & VERIFICATION SECTION
             ========================================================= */}
          {activeTab === "ATTENDANCE" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 5 Columns: Quick QR Verification Tool */}
              <div className="lg:col-span-5 rounded-2xl bg-bg-card border border-border-muted p-6 space-y-5 shadow-card">
                <div className="flex items-center justify-between border-b border-border-muted pb-3">
                  <div>
                    <h2 className="font-display font-bold text-lg text-text-primary">
                      Verify Ticket QR Code
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Validate ownership and mark a ticket as Used for one-time gate entry
                    </p>
                  </div>
                  <Link
                    to="/verify"
                    className="text-xs font-medium text-accent-cyan hover:underline"
                  >
                    Camera Scanner →
                  </Link>
                </div>

                <form onSubmit={handleInlineVerifyQr} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-text-secondary mb-1.5">
                      Target Event Gate
                    </label>
                    <select
                      value={selectedGateEventId}
                      onChange={(e) => setSelectedGateEventId(e.target.value)}
                      className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary"
                    >
                      {overview?.events?.map((ev: any) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-text-secondary mb-1.5">
                      QR Payload or Ticket ID
                    </label>
                    <textarea
                      rows={3}
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Paste signed QR payload or Ticket ID..."
                      className="w-full rounded-xl border border-border-muted bg-bg-secondary p-3 font-mono text-xs text-text-primary focus:outline-none focus:border-accent-violet"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQrInput("11111111-2222-4333-8444-555555550001")}
                      className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2.5 py-1.5 text-[11px] text-text-secondary hover:text-text-primary"
                    >
                      Sample Unused Ticket (#MOD-001)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrInput("11111111-2222-4333-8444-555555550003")}
                      className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-2.5 py-1.5 text-[11px] text-text-secondary hover:text-text-primary"
                    >
                      Sample Used Ticket (#MOD-003)
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={scanning || !qrInput.trim()}
                    className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-sm py-3 transition-colors disabled:opacity-50"
                  >
                    {scanning ? "Verifying Ticket..." : "Verify & Admit Attendee"}
                  </button>
                </form>

                {scanOutcome && (
                  <div
                    className={`rounded-xl border p-4 space-y-2 text-xs ${
                      scanOutcome.admitted
                        ? "border-status-success/40 bg-status-success/10 text-status-success"
                        : "border-status-error/40 bg-status-error/10 text-status-error"
                    }`}
                  >
                    <div className="font-display font-bold text-sm">
                      {scanOutcome.admitted
                        ? "Valid Ticket — Attendee Admitted"
                        : `Rejected — ${scanOutcome.verificationResult}`}
                    </div>
                    <p className="text-text-primary">{scanOutcome.message}</p>
                  </div>
                )}
              </div>

              {/* Right 7 Columns: Verification Logs & Ticket Statuses */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
                  <div className="p-5 border-b border-border-muted">
                    <h3 className="font-display font-bold text-base text-text-primary">
                      Recent Gate Verification Logs
                    </h3>
                  </div>

                  {!overview?.recentVerifications || overview.recentVerifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-secondary">
                      No gate scans recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                            <th className="p-3.5 font-medium">Scanned At</th>
                            <th className="p-3.5 font-medium">Event & Seat</th>
                            <th className="p-3.5 font-medium">Verification Result</th>
                            <th className="p-3.5 font-medium">Provenance / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-muted">
                          {overview.recentVerifications.map((log: any) => (
                            <tr key={log.id} className="hover:bg-bg-secondary/40">
                              <td className="p-3.5 text-text-secondary">
                                {new Date(log.scannedAt).toLocaleString()}
                              </td>
                              <td className="p-3.5">
                                <div className="font-medium text-text-primary">
                                  {log.event?.name}
                                </div>
                                <div className="text-text-secondary">
                                  {log.ticket?.seatNumber || "Unknown Ticket"}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`inline-block rounded-lg px-2.5 py-0.5 font-medium ${
                                    log.verificationResult === "VALID_ADMITTED"
                                      ? "bg-status-success/15 text-status-success"
                                      : "bg-status-error/15 text-status-error"
                                  }`}
                                >
                                  {log.verificationResult}
                                </span>
                              </td>
                              <td className="p-3.5 text-text-secondary">{log.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              6. BLOCKCHAIN ACTIVITY SECTION
             ========================================================= */}
          {activeTab === "BLOCKCHAIN" && (
            <div className="space-y-6">
              {/* Network Identification Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-bg-card border border-border-muted p-5">
                  <div className="text-xs text-text-secondary">Configured Blockchain</div>
                  <div className="font-display font-bold text-lg text-text-primary mt-1">
                    Sui Network ({overview?.systemStatus?.blockchain?.network || "testnet"})
                  </div>
                  <div className="text-xs text-accent-cyan mt-1">
                    RPC Reachable:{" "}
                    {overview?.systemStatus?.blockchain?.rpcReachable ? "Yes" : "Offline / Local"}
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-5">
                  <div className="text-xs text-text-secondary">Move Smart Contract Package</div>
                  <div className="font-mono text-xs text-accent-cyan mt-2 break-all">
                    {overview?.systemStatus?.blockchain?.packageId}
                  </div>
                </div>

                <div className="rounded-2xl bg-bg-card border border-border-muted p-5">
                  <div className="text-xs text-text-secondary">Active Execution Mode</div>
                  <div className="font-display font-bold text-lg text-text-primary mt-1">
                    {executionMode === "SUI_TESTNET"
                      ? "Sui Testnet (On-Chain)"
                      : "Local Demo (Simulated)"}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Clearly distinguishes local demo records from on-chain digests
                  </div>
                </div>
              </div>

              {/* NFT Minting, Resale & Transfer Ledger */}
              <div className="rounded-2xl bg-bg-card border border-border-muted overflow-hidden shadow-card">
                <div className="p-6 border-b border-border-muted">
                  <h2 className="font-display font-bold text-lg text-text-primary">
                    NFT Minting & Transfer Ledger
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Complete audit trail of ticket issuances, resales, and peer transfers for your
                    events
                  </p>
                </div>

                {!overview?.recentTransactions || overview.recentTransactions.length === 0 ? (
                  <div className="p-10 text-center text-sm text-text-secondary">
                    No blockchain or local demo transactions recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-bg-secondary border-b border-border-muted text-text-secondary">
                          <th className="p-4 font-medium">Timestamp</th>
                          <th className="p-4 font-medium">Operation</th>
                          <th className="p-4 font-medium">Event & Buyer</th>
                          <th className="p-4 font-medium">Amount</th>
                          <th className="p-4 font-medium">Network & Provenance</th>
                          <th className="p-4 font-medium">Transaction Identifier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-muted">
                        {overview.recentTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-bg-secondary/40">
                            <td className="p-4 text-text-secondary">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td className="p-4 font-medium text-text-primary">
                              {tx.transactionType.replace("_", " ")}
                            </td>
                            <td className="p-4">
                              <div className="text-text-primary">
                                {tx.ticket?.event?.name || "Event"}
                              </div>
                              <div className="text-text-secondary">
                                Buyer: {tx.buyer?.name} ({tx.buyer?.email})
                              </div>
                            </td>
                            <td className="p-4 font-medium text-text-primary">
                              {tx.amount} units
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                                  tx.isSimulated
                                    ? "bg-bg-secondary border border-border-muted text-text-secondary"
                                    : "bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan"
                                }`}
                              >
                                {tx.isSimulated
                                  ? "Local Demo (Simulated)"
                                  : "Confirmed On-Chain (Sui Testnet)"}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-accent-cyan">
                              {tx.transactionDigest
                                ? tx.transactionDigest
                                : `sim:${tx.id.slice(0, 12)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
