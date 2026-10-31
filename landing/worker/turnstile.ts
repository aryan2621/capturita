import { fetchT } from "./http";

/** Optional: passes when no secret is configured. */
export async function verifyTurnstile(token: string | undefined, secret: string | undefined, ip?: string): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetchT("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    return res.ok && ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}
