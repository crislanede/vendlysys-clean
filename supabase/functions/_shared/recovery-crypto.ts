// Server-only recovery primitives. Never store or log the plaintext code.
// A server-side secret is mandatory to prevent offline brute force of 6-digit codes.
const encoder = new TextEncoder();

export function generateRecoveryCode(): string {
  const bytes = new Uint32Array(1);
  const limit = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

export async function recoveryCodeDigest(requestId: string, code: string): Promise<string> {
  const secret = Deno.env.get("MFA_RECOVERY_TOKEN_SECRET");
  if (!secret || secret.length < 32) throw new Error("Recovery secret is not configured");
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^\d{6}$/.test(code)) throw new Error("Invalid recovery token input");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${requestId}:${code}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeHexEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}
