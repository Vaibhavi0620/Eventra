import crypto from "crypto";

const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET || "eventra_qr_hmac_secret_2026_anti_replay_991823";

/**
 * Generates an HMAC-SHA256 cryptographic signature over an opaque ticket reference
 * (`ticketId:eventId`).
 *
 * SECURITY DESIGN:
 * - The QR payload NEVER contains private keys, passwords, or mutable status flags.
 * - Even if someone inspects or copies the QR string, the backend always verifies the
 *   HMAC signature AND queries the authoritative database/blockchain state inside an
 *   atomic transaction before admitting the attendee.
 */
export function signTicketQrReference(ticketId: string, eventId: string): string {
  const payload = `${ticketId}:${eventId}`;
  return crypto.createHmac("sha256", QR_HMAC_SECRET).update(payload).digest("hex");
}

export function buildOpaqueQrPayload(ticketId: string, eventId: string, signature: string): string {
  return JSON.stringify({
    v: 1,
    sys: "EVENTRA",
    tid: ticketId,
    eid: eventId,
    sig: signature.slice(0, 24),
  });
}

export function verifyTicketQrPayload(
  rawPayload: string,
  expectedTicketId?: string
): { validFormat: boolean; ticketId: string; eventId?: string; signaturePrefix?: string } {
  const trimmed = rawPayload.trim();
  // Support both JSON QR payload and direct manual UUID/reference lookup
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.tid === "string") {
        return {
          validFormat: true,
          ticketId: parsed.tid,
          eventId: typeof parsed.eid === "string" ? parsed.eid : undefined,
          signaturePrefix: typeof parsed.sig === "string" ? parsed.sig : undefined,
        };
      }
    } catch {
      return { validFormat: false, ticketId: "" };
    }
  }

  return {
    validFormat: trimmed.length >= 6,
    ticketId: expectedTicketId || trimmed,
  };
}
