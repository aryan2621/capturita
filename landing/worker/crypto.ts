const enc = new TextEncoder();

export async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time compare. Hashing first makes lengths equal, so length is not leaked either. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([a, b].map(async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const TOKEN_TTL = 7 * 86400;

/** Per-order secret for the success page: "expiry.HMAC(order id, expiry)". Without it an order id alone reveals nothing, and a leaked URL stops working after a week. */
export const orderToken = async (orderId: string, secret: string, now = Math.floor(Date.now() / 1000)) => {
  const exp = now + TOKEN_TTL;
  return `${exp}.${await hmacSha256Hex(`order:${orderId}:${exp}`, secret)}`;
};
export async function checkOrderToken(orderId: string, token: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  const [exp, mac] = token.split(".");
  if (!secret || !/^\d+$/.test(exp ?? "") || !mac || Number(exp) < now) return false;
  return safeEqual(await hmacSha256Hex(`order:${orderId}:${exp}`, secret), mac);
}
