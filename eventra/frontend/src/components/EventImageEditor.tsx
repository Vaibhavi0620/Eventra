import React, { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { getStoredToken } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photo control for privileged users. Renders nothing for customers/guests.
 * The backend re-checks the role and event ownership, so this is convenience only.
 */
export const EventImageEditor: React.FC<{
  eventId: string;
  organizerId?: string;
  onChanged: (event: any) => void;
  className?: string;
}> = ({ eventId, organizerId, onChanged, className = "" }) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed =
    !!user && (user.role === "ADMIN" || (user.role === "ORGANIZER" && (!organizerId || organizerId === user.id)));
  if (!allowed) return null;

  const call = async (init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/image`, {
        ...init,
        headers: { ...(init.headers || {}), Authorization: `Bearer ${getStoredToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
      onChanged(data.event);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is larger than 5 MB.");
      return;
    }
    call({ method: "POST", headers: { "Content-Type": file.type }, body: file });
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="hidden" />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full bg-bg-primary/80 border border-text-primary/30 text-text-primary text-xs uppercase tracking-[0.15em] px-4 py-2 hover:border-text-primary disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
          {busy ? "Uploading" : "Change photo"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => call({ method: "DELETE" })}
          aria-label="Remove photo"
          className="rounded-full bg-bg-primary/80 border border-text-primary/30 text-text-secondary p-2 hover:text-text-primary disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-status-error">{error}</p>}
    </div>
  );
};
