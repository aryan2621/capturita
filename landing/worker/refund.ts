import type { Env } from "./types";
import { nowSec, withinRefundWindow } from "./product";
import { RazorpayClient } from "./razorpay";

export class RefundError extends Error {
  constructor(message: string, public status: 404 | 409 | 502) { super(message); }
}

/** Marks the order refunded and revokes its license. Returns true only for the call that made the change. */
export async function markRefunded(env: Env, orderId: string, refundId: string, reason?: string): Promise<boolean> {
  const now = nowSec();
  const [res] = await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status = 'refunded', refunded_at = ?, refund_id = ?, refund_reason = ? WHERE id = ? AND status = 'paid'")
      .bind(now, refundId, reason ?? null, orderId),
    env.DB.prepare("UPDATE licenses SET status = 'revoked', revoked_at = ?, revoked_reason = 'refunded' WHERE order_id = ? AND status = 'active'").bind(now, orderId),
  ]);
  if (!res.meta.changes) return false;
  return true;
}

/** Owner-approved full refund: paid, inside the 14-day window, then Razorpay, then our records. */
export async function refundOrder(env: Env, orderId: string, reason?: string, now = nowSec()) {
  const row = await env.DB.prepare(
    "SELECT status, paid_at, amount_paise, razorpay_payment_id AS payment_id FROM orders WHERE id = ?",
  ).bind(orderId).first<{ status: string; paid_at: number | null; amount_paise: number; payment_id: string | null }>();
  if (!row) throw new RefundError("Order not found or not paid", 404);
  if (row.status !== "paid" || row.paid_at === null || !row.payment_id) throw new RefundError(`Order is ${row.status}`, 409);
  if (!withinRefundWindow(row.paid_at, now)) throw new RefundError("Outside the 14-day refund window", 409);

  let refundId: string;
  try {
    refundId = (await new RazorpayClient(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET).refundPayment(row.payment_id, row.amount_paise, { order_id: orderId })).id;
  } catch (e) {
    throw new RefundError(`Razorpay refund failed: ${(e as Error).message}`, 502);
  }
  await markRefunded(env, orderId, refundId, reason);
  return { orderId, refundId };
}
