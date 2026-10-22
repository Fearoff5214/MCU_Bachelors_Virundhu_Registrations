import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";

function secret() {
  const s = process.env.QR_SECRET;
  if (!s || s.length < 32) throw new Error("QR_SECRET must be set (32+ chars)");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 32);
}

/** Token encoded into the QR: "<ticketId>.<hmac>". Contains no personal data. */
export function signTicket(ticketId: string) {
  return `${ticketId}.${sign(ticketId)}`;
}

/** Returns the ticket id when the signature is genuine, otherwise null. */
export function verifyTicketToken(token: string): string | null {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return null;
  const [id, mac] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

// No 0/O/1/I/L so codes can be read aloud at the gate.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateTicketCode() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `BV-${pick()}-${pick()}`;
}

export function normaliseCode(input: string) {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = raw.startsWith("BV") ? raw.slice(2) : raw;
  return body.length === 8 ? `BV-${body.slice(0, 4)}-${body.slice(4)}` : null;
}

export function qrDataUrl(token: string, size = 512) {
  return QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 2, width: size });
}

export function qrPngBuffer(token: string, size = 512) {
  return QRCode.toBuffer(token, { errorCorrectionLevel: "M", margin: 2, width: size, type: "png" });
}
