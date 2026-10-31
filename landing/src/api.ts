export async function postJson<T = any>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000);
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
  } finally {
    clearTimeout(timer);
  }
}

let sdk: Promise<void> | undefined;
/** Loads Razorpay Checkout only when someone is buying. A failed load can be retried. */
export function loadRazorpay(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve();
  sdk ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => { sdk = undefined; s.remove(); reject(new Error("Could not load the payment window. Check your connection or ad blocker.")); };
    document.head.appendChild(s);
  });
  return sdk;
}

let ts: Promise<void> | undefined;
/** Loads Cloudflare Turnstile only when the dialog needs it. A failed load can be retried. */
export function loadTurnstile(): Promise<void> {
  if ((window as any).turnstile) return Promise.resolve();
  ts ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.onload = () => resolve();
    s.onerror = () => { ts = undefined; s.remove(); reject(new Error("Could not load the bot check. Check your connection or ad blocker.")); };
    document.head.appendChild(s);
  });
  return ts;
}
