import type { Env } from "./types";
import { verifyWebhookSignature } from "./razorpay";
import { PermanentError, fulfillOrder } from "./fulfill";
import { markRefunded } from "./refund";
import { nowSec } from "./product";

interface RzpEvent {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; method?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
  };
}

async function process(env: Env, ev: RzpEvent) {
  const pay = ev.payload?.payment?.entity;
  switch (ev.event) {
    case "payment.captured":
    case "order.paid":
      if (pay?.id && pay.order_id && pay.amount !== undefined && pay.currency)
        await fulfillOrder(env, { id: pay.id, orderId: pay.order_id, amount: pay.amount, currency: pay.currency, method: pay.method });
      break;
    case "refund.processed": {
      const r = ev.payload?.refund?.entity;
      if (!r?.id || !r.payment_id) break;
      const row = await env.DB.prepare("SELECT id AS order_id, amount_paise FROM orders WHERE razorpay_payment_id = ?")
        .bind(r.payment_id).first<{ order_id: string; amount_paise: number }>();
      // Refunds of duplicate payments match no order here, so they never touch the real license. Partial refunds (made in the Razorpay dashboard) keep the license; only full ones revoke.
      if (row && (r.amount ?? 0) >= row.amount_paise) await markRefunded(env, row.order_id, r.id, "refund.processed");
      break;
    }
  }
}

export async function handleWebhook(env: Env, rawBody: string, signature: string | undefined, eventId: string | undefined): Promise<Response> {
  if (!signature || !(await verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET))) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  let ev: RzpEvent;
  try { ev = JSON.parse(rawBody); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!eventId) return Response.json({ error: "Missing event id" }, { status: 400 });

  // The PK insert is the idempotency gate; a retry of an already-processed event is a no-op.
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO events (id, type, received_at) VALUES (?, ?, ?)").bind(eventId, String(ev.event), nowSec()).run();
  if (!ins.meta.changes) {
    const prev = await env.DB.prepare("SELECT processed_at FROM events WHERE id = ?").bind(eventId).first<{ processed_at: number | null }>();
    if (prev?.processed_at) return Response.json({ status: "already_processed" });
  }
  try {
    await process(env, ev);
    await env.DB.prepare("UPDATE events SET processed_at = ?, error = NULL WHERE id = ?").bind(nowSec(), eventId).run();
    return Response.json({ status: "ok" });
  } catch (e) {
    const msg = (e as Error).message.slice(0, 200);
    if (e instanceof PermanentError) {
      // Handled as far as it can be (recorded for the owner); a 5xx would only make Razorpay retry forever.
      await env.DB.prepare("UPDATE events SET processed_at = ?, error = ? WHERE id = ?").bind(nowSec(), msg, eventId).run();
      return Response.json({ status: "ignored" });
    }
    await env.DB.prepare("UPDATE events SET error = ? WHERE id = ?").bind(msg, eventId).run();
    return Response.json({ error: "Processing failed" }, { status: 500 }); // transient: Razorpay retries; fulfil is idempotent
  }
}
