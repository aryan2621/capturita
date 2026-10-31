import { hmacSha256Hex, safeEqual } from "./crypto";
import { fetchT } from "./http";

export interface RzpPayment { id: string; order_id: string; amount: number; currency: string; status: string; method?: string }

const BASE = "https://api.razorpay.com/v1";

export class RazorpayClient {
  private auth: string;
  constructor(keyId: string, private keySecret: string) {
    this.auth = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
  }

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchT(`${BASE}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: this.auth, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { description?: string } } | null;
      throw new Error(err?.error?.description || `Razorpay error ${res.status}`);
    }
    return (await res.json()) as T;
  }

  createOrder(p: { amount: number; receipt: string; notes?: Record<string, string> }) {
    return this.request<{ id: string; amount: number; currency: string }>("/orders", { ...p, currency: "INR" });
  }

  refundPayment(paymentId: string, amountPaise: number, notes?: Record<string, string>) {
    return this.request<{ id: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, notes });
  }

  fetchPayment(paymentId: string) {
    return this.request<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}`);
  }

  /** Checkout handler signature: HMAC(order_id|payment_id) with the key secret. */
  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    return safeEqual(await hmacSha256Hex(`${orderId}|${paymentId}`, this.keySecret), signature);
  }
}

/** Webhook signature: HMAC of the raw body with the webhook secret. */
export async function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  return !!secret && !!signature && safeEqual(await hmacSha256Hex(rawBody, secret), signature);
}
