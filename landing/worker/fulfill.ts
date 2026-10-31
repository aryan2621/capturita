import type { Env, LicensePayload } from "./types";
import { PRODUCT, newId, nowSec } from "./product";
import { signLicense, verifyLicense } from "./license";
import { RazorpayClient } from "./razorpay";

/** A payment we will never be able to accept (unknown order, amount mismatch). Retrying cannot help. */
export class PermanentError extends Error {}

export interface PaymentInfo { id: string; orderId: string; amount: number; currency: string; method?: string }
export interface Fulfilled { orderId: string; licenseKey: string | null; alreadyFulfilled: boolean; duplicate?: boolean }

interface OrderRow { id: string; customer_id: string; amount_paise: number; currency: string; status: string; razorpay_payment_id: string | null }

const keyFor = (env: Env, orderId: string) =>
  env.DB.prepare("SELECT key FROM licenses WHERE order_id = ?").bind(orderId).first<{ key: string }>();

/** A second capture on an order that another payment already fulfilled: refund it, or flag it for the owner. */
async function handleDuplicate(env: Env, order: OrderRow, pay: PaymentInfo): Promise<Fulfilled> {
  const seen = await env.DB.prepare("SELECT status FROM payments WHERE id = ?").bind(pay.id).first();
  if (!seen) {
    let status = "needs_refund";
    try {
      await new RazorpayClient(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET).refundPayment(pay.id, pay.amount, { reason: "duplicate payment", order_id: order.id });
      status = "duplicate_refunded";
    } catch (e) {
      console.error("duplicate auto-refund failed", pay.id, (e as Error).message);
    }
    await env.DB.prepare("INSERT OR IGNORE INTO payments (id, order_id, amount_paise, method, status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(pay.id, order.id, pay.amount, pay.method ?? null, status, nowSec()).run();
  }
  return { orderId: order.id, licenseKey: (await keyFor(env, order.id))?.key ?? null, alreadyFulfilled: true, duplicate: true };
}

/**
 * Issues the license for a captured Razorpay payment, exactly once, however the checkout callback
 * and the webhooks race or retry. The order flips pending/expired -> paid and the license row is
 * inserted in ONE batch (a transaction); licenses.order_id and orders.razorpay_payment_id are UNIQUE,
 * so a concurrent loser rolls back and returns the winner's key. Only the winner emails.
 */
export async function fulfillOrder(env: Env, pay: PaymentInfo): Promise<Fulfilled> {
  const order = await env.DB.prepare("SELECT id, customer_id, amount_paise, currency, status, razorpay_payment_id FROM orders WHERE razorpay_order_id = ?")
    .bind(pay.orderId).first<OrderRow>();
  if (!order) throw new PermanentError("Order not found");
  if (pay.amount !== order.amount_paise || pay.currency !== order.currency) throw new PermanentError("Payment amount or currency does not match order");

  if (order.status === "paid" || order.status === "refunded") {
    if (order.razorpay_payment_id === pay.id) return { orderId: order.id, licenseKey: (await keyFor(env, order.id))?.key ?? null, alreadyFulfilled: true };
    return handleDuplicate(env, order, pay);
  }

  const customer = await env.DB.prepare("SELECT email FROM customers WHERE id = ?").bind(order.customer_id).first<{ email: string }>();
  if (!customer) throw new PermanentError("Customer not found");

  const now = nowSec();
  const licId = newId("lic");
  const updatesUntil = now + PRODUCT.updatesMonths * 30 * 86400;
  const payload: LicensePayload = {
    v: 1, lic: licId, product: PRODUCT.id, email: customer.email, plan: "pro", seats: 1,
    issued: now, updates_until: updatesUntil, expires: null, kid: env.LICENSE_KID || "v1",
  };
  const key = await signLicense(payload, env.LICENSE_PRIVATE_KEY);
  if (env.LICENSE_PUBLIC_KEY_RAW) {
    // Refuse to sell a key the desktop app's public key would reject.
    const check = await verifyLicense(key, PRODUCT.id, env.LICENSE_PUBLIC_KEY_RAW);
    if (!check.valid) throw new Error("Issued license failed self-check");
  }

  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET status = 'paid', paid_at = ?, razorpay_payment_id = ? WHERE id = ? AND status IN ('pending','expired')")
        .bind(now, pay.id, order.id),
      env.DB.prepare("INSERT INTO payments (id, order_id, amount_paise, method, status, created_at) VALUES (?, ?, ?, ?, 'captured', ?)")
        .bind(pay.id, order.id, order.amount_paise, pay.method ?? null, now),
      env.DB.prepare("INSERT INTO licenses (id, order_id, customer_id, key, issued_at, updates_until) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(licId, order.id, order.customer_id, key, now, updatesUntil),
    ]);
  } catch (e) {
    // Lost the race (or the payment id was already recorded): the other call fulfilled it.
    const fresh = await env.DB.prepare("SELECT razorpay_payment_id FROM orders WHERE id = ?").bind(order.id).first<{ razorpay_payment_id: string | null }>();
    if (!fresh?.razorpay_payment_id) throw e;
    if (fresh.razorpay_payment_id !== pay.id) return handleDuplicate(env, { ...order, status: "paid" }, pay);
    return { orderId: order.id, licenseKey: (await keyFor(env, order.id))?.key ?? null, alreadyFulfilled: true };
  }

  // The key is stored and shown on /success.
  return { orderId: order.id, licenseKey: key, alreadyFulfilled: false };
}
