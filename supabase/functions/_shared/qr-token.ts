export interface QrTokenClaims {
  attendee_id: string;
  event_id: string;
  invitation_id: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url value.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error("QR signing secret is not configured.");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function isClaims(value: unknown): value is QrTokenClaims {
  if (value === null || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  return typeof claims.attendee_id === "string" &&
    typeof claims.event_id === "string" &&
    typeof claims.invitation_id === "string" &&
    Number.isInteger(claims.iat) && Number.isInteger(claims.exp);
}

export async function signQrToken(
  claims: Omit<QrTokenClaims, "iat" | "exp">,
  secret: string,
  options: { now?: Date; expiresInSeconds?: number } = {},
): Promise<string> {
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const expiresInSeconds = options.expiresInSeconds ?? 60 * 60 * 24 * 365;
  const header = encodeBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = encodeBase64Url(encoder.encode(JSON.stringify({ ...claims, iat: now, exp: now + expiresInSeconds })));
  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), encoder.encode(unsignedToken));
  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyQrToken(
  token: string,
  secret: string,
  options: { now?: Date } = {},
): Promise<QrTokenClaims> {
  const segments = token.split(".");
  if (segments.length !== 3) throw new Error("Malformed QR token.");
  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader))) as Record<string, unknown>;
  if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("Unsupported QR token.");

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    decodeBase64Url(encodedSignature),
    encoder.encode(unsignedToken),
  );
  if (!valid) throw new Error("Invalid QR token signature.");

  const claims: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
  if (!isClaims(claims)) throw new Error("Invalid QR token claims.");
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  if (claims.exp <= now) throw new Error("QR token has expired.");
  if (claims.iat > now + 60) throw new Error("QR token was issued in the future.");
  return claims;
}
