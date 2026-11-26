import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  QrCode,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export const QRVerificationPage: React.FC = () => {
  const { executionMode } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const [manualInput, setManualInput] = useState("");
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    apiRequest<{ events: any[] }>("/events")
      .then((res) => {
        setEvents(res.events);
        if (res.events.length > 0) {
          setSelectedEventId(res.events[0].id);
        }
      })
      .catch(() => {});

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-viewport");
      scannerRef.current = html5QrCode;
      setCameraActive(true);

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await html5QrCode.stop().catch(() => {});
          setCameraActive(false);
          setManualInput(decodedText);
          await executeGateVerification(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(
        err?.message ||
          "Browser camera unavailable or permission denied. Use the manual QR payload / Ticket ID verifier below."
      );
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    setCameraActive(false);
  };

  const executeGateVerification = async (payloadToVerify: string) => {
    setProcessing(true);
    setError(null);
    setScanResult(null);
    setLookupResult(null);

    try {
      const res = await apiRequest("/verification/scan", {
        method: "POST",
        body: JSON.stringify({
          qrPayload: payloadToVerify.trim(),
          eventId: selectedEventId || undefined,
          mode: executionMode,
        }),
      });
      setScanResult(res);
    } catch (err: any) {
      if (err.data && err.data.verificationResult) {
        setScanResult(err.data);
      } else {
        setError(err.message || "Gate verification failed.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleInspectReadOnly = async () => {
    if (!manualInput.trim()) return;
    setProcessing(true);
    setError(null);
    setScanResult(null);
    setLookupResult(null);

    let ticketId = manualInput.trim();
    if (ticketId.startsWith("{")) {
      try {
        const parsed = JSON.parse(ticketId);
        if (parsed.tid) ticketId = parsed.tid;
      } catch {
        // ignore
      }
    }

    try {
      const res = await apiRequest(`/verification/${ticketId}`);
      setLookupResult(res);
    } catch (err: any) {
      setError(err.message || "Ticket ID not found.");
    } finally {
      setProcessing(false);
    }
  };

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
        <div className="rounded-xl bg-bg-card border border-border-muted px-4 py-2 text-xs text-text-secondary">
          Verification Mode:{" "}
          <strong className="text-accent-cyan">
            {executionMode === "SUI_TESTNET" ? "Sui Testnet (On-Chain)" : "Local Demo"}
          </strong>
        </div>
      </div>

      <div className="pb-6 border-b border-border-muted">
        <span className="text-xs font-medium text-accent-violet">
          Venue Entry Gate Scanner
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
          QR Ticket Admission & Verification
        </h1>
        <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">
          Scan attendee QR codes with a browser camera or verify signed ticket references manually.
          Each valid scan atomically marks the ticket as Used to prevent duplicate entry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 6 Columns: Camera QR Scanner + Manual Ticket-ID Lookup */}
        <div className="lg:col-span-6 space-y-6">
          {/* Event Gate Selector */}
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
            <label className="block text-xs font-medium text-text-secondary">
              1. Active Event Gate
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.venue})
                </option>
              ))}
            </select>
            <p className="text-xs text-text-secondary">
              Tickets issued for a different event are automatically rejected at this gate.
            </p>
          </div>

          {/* Browser Camera Scanner */}
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-base text-text-primary">
                2. Camera QR Scanner
              </span>
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary px-4 py-2 text-xs font-medium transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Start Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-bg-elevated border border-border-muted text-text-primary px-4 py-2 text-xs font-medium transition-colors"
                >
                  <CameraOff className="w-4 h-4" />
                  Stop Camera
                </button>
              )}
            </div>

            <div
              id="qr-reader-viewport"
              className="w-full min-h-[220px] rounded-xl border border-border-muted bg-bg-secondary flex items-center justify-center p-6 text-center"
            >
              {!cameraActive && (
                <div className="space-y-2 text-text-secondary text-xs">
                  <QrCode className="w-10 h-10 mx-auto text-accent-violet" />
                  <div>Camera on standby. Click &ldquo;Start Camera&rdquo; to scan a QR pass.</div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="rounded-xl border border-status-warning/40 bg-status-warning/10 p-3.5 text-xs text-status-warning">
                {cameraError}
              </div>
            )}
          </div>

          {/* Manual Ticket-ID & Signed QR Payload Lookup */}
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-4 shadow-card">
            <span className="font-display font-bold text-base text-text-primary block">
              3. Manual Ticket Reference or QR Payload
            </span>

            <textarea
              rows={3}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder='Paste signed QR JSON payload {"v":1,"sys":"EVENTRA","tid":"..."} or Ticket ID'
              className="w-full rounded-xl border border-border-muted bg-bg-secondary p-3.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-violet"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManualInput("11111111-2222-4333-8444-555555550001")}
                className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Sample Unused Ticket (#MOD-001)
              </button>
              <button
                type="button"
                onClick={() => setManualInput("11111111-2222-4333-8444-555555550003")}
                className="rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-muted px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Sample Used Ticket (#MOD-003 — Tests Duplicate Block)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={processing || !manualInput.trim()}
                onClick={handleInspectReadOnly}
                className="rounded-xl bg-bg-secondary hover:bg-bg-elevated border border-border-muted text-text-primary font-medium text-xs py-3 transition-colors disabled:opacity-50"
              >
                Check Status Only
              </button>
              <button
                type="button"
                disabled={processing || !manualInput.trim()}
                onClick={() => executeGateVerification(manualInput)}
                className="rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-xs py-3 transition-colors disabled:opacity-50"
              >
                Verify & Admit (Mark Used)
              </button>
            </div>
          </div>
        </div>

        {/* Right 6 Columns: Verification Outcome */}
        <div className="lg:col-span-6 space-y-6">
          {error && (
            <div className="rounded-2xl border border-status-error/40 bg-status-error/10 p-5 text-xs text-status-error">
              <strong>Verification Error:</strong> {error}
            </div>
          )}

          {scanResult && (
            <div
              className={`rounded-2xl border p-6 space-y-4 shadow-card ${
                scanResult.admitted
                  ? "bg-status-success/10 border-status-success/40"
                  : "bg-status-error/10 border-status-error/40"
              }`}
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-border-muted">
                {scanResult.admitted ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-status-success shrink-0" />
                    <span className="font-display font-bold text-lg text-status-success">
                      Valid Ticket — Attendee Admitted
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-status-error shrink-0" />
                    <span className="font-display font-bold text-lg text-status-error">
                      Entry Rejected — {scanResult.verificationResult}
                    </span>
                  </>
                )}
              </div>

              <div className="text-sm font-medium text-text-primary">{scanResult.message}</div>

              {scanResult.ticket && (
                <div className="rounded-xl bg-bg-card border border-border-muted p-4 space-y-2 text-xs text-text-secondary">
                  <div className="flex justify-between">
                    <span>Ticket ID</span>
                    <span className="font-mono text-accent-cyan">{scanResult.ticket.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seat & Tier</span>
                    <span className="text-text-primary font-medium">
                      {scanResult.ticket.seatNumber} ({scanResult.ticket.tierName})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Event</span>
                    <span className="text-text-primary">{scanResult.ticket.event?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Owner</span>
                    <span className="text-text-primary">
                      {scanResult.ticket.currentOwner?.name} (
                      {scanResult.ticket.currentOwner?.email})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ticket Status</span>
                    <span className="font-medium text-status-warning">
                      {scanResult.ticket.currentStatus}
                    </span>
                  </div>
                </div>
              )}

              {scanResult.admitted && (
                <button
                  type="button"
                  onClick={() => executeGateVerification(manualInput)}
                  className="w-full rounded-xl bg-bg-elevated hover:bg-bg-card border border-border-muted text-text-primary text-xs font-medium py-2.5 transition-colors"
                >
                  Test Immediate Replay Scan (Verify Duplicate Rejection)
                </button>
              )}
            </div>
          )}

          {lookupResult && (
            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 text-xs shadow-card">
              <div className="font-display font-bold text-base text-text-primary border-b border-border-muted pb-3">
                Read-Only Ticket Inspection
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Eligible for Entry</span>
                {lookupResult.isValidForEntry ? (
                  <span className="text-status-success font-medium">Yes (Active & Unused)</span>
                ) : (
                  <span className="text-status-error font-medium">No (Already Used)</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Ticket ID</span>
                <span className="font-mono text-accent-cyan">{lookupResult.ticket.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Owner</span>
                <span className="text-text-primary">
                  {lookupResult.ticket.currentOwner?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status</span>
                <span className="text-text-primary">{lookupResult.ticket.currentStatus}</span>
              </div>
            </div>
          )}

          {/* Plain-Language Gate Protection Summary */}
          <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3 shadow-card">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-cyan">
              <ShieldCheck className="w-4 h-4" />
              Single-Entry Protection
            </div>
            <h2 className="font-display font-bold text-lg text-text-primary">
              How One-Time QR Verification Works
            </h2>
            <ul className="space-y-2 text-xs text-text-secondary leading-relaxed">
              <li>
                • <strong className="text-text-primary">Signed Ticket Reference:</strong> Each QR
                code carries an HMAC-SHA256 cryptographic signature tied to the ticket ID and event
                ID so screenshots cannot be forged.
              </li>
              <li>
                • <strong className="text-text-primary">Atomic Check-In Lock:</strong> When scanned
                at the venue gate, the database and smart contract transition the ticket status from
                Active to Used in a single atomic step, blocking concurrent or repeat scans.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
