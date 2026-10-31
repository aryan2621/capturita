import type { Context, Next } from "hono";
import type { Env } from "./types";

export async function securityHeaders(c: Context, next: Next) {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("Cache-Control", "no-store");
  c.res.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
}

/** CORS is closed: reject browser POSTs from another origin. No Origin header (curl, Razorpay webhooks) passes. */
export async function sameOrigin(c: Context, next: Next) {
  const origin = c.req.header("origin");
  if (c.req.method !== "GET" && origin && origin !== new URL(c.req.url).origin) return c.json({ error: "Forbidden" }, 403);
  await next();
}

/** True if allowed. A missing binding (local dev) allows. */
export async function allow(env: Env, name: "CHECKOUT_LIMITER" | "LICENSE_LIMITER", key: string) {
  const limiter = env[name];
  return !limiter || (await limiter.limit({ key })).success;
}
