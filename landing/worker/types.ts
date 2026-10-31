export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  CHECKOUT_LIMITER?: RateLimit;
  LICENSE_LIMITER?: RateLimit;

  SITE_URL: string;
  SUPPORT_EMAIL: string;
  LICENSE_KID?: string;

  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  LICENSE_PRIVATE_KEY: string;
  LICENSE_PUBLIC_KEY_RAW?: string;
  ADMIN_TOKEN?: string;
  ORDER_TOKEN_SECRET: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
}

/** Fields the desktop app (src-tauri/src/license.rs) reads, plus bookkeeping. */
export interface LicensePayload {
  v?: number;
  lic: string;
  product: string;
  email: string;
  plan: string;
  seats: number;
  issued: number;
  updates_until: number;
  expires: number | null;
  kid: string;
}
