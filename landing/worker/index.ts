import { Hono, type Context } from "hono";
import type { ZodType } from "zod";
import type { Env } from "./types";
import { PRODUCT, newId, nowSec } from "./product";
import { activate, deactivate } from "./activation";
import { activateSchema, checkoutSchema, deactivateSchema, recoverSchema, refundSchema, verifySchema } from "./schema";
import { RazorpayClient } from "./razorpay";
import { checkOrderToken, orderToken, safeEqual } from "./crypto";
import { allow, sameOrigin, securityHeaders } from "./security";
import { verifyTurnstile } from "./turnstile";
import { PermanentError, fulfillOrder } from "./fulfill";
import { handleWebhook } from "./webhooks";
import { RefundError, refundOrder } from "./refund";

type C = Context<{ Bindings: Env }>;
const app = new Hono<{ Bindings: Env }>();

app.use("*", securityHeaders);
app.use("/api/*", sameOrigin);

const OPEN_ORDER_SECONDS = 30 * 60;
const ip = (c: C) => c.req.header("cf-connecting-ip") || "anon";

async function parse<T>(c: C, schema: ZodType<T, any, any>): Promise<T | null> {
  const raw = await c.req.json().catch(() => null);
  const r = schema.safeParse(raw);
  return r.success ? r.data : null;
}

app.get("/api/config/public", (c) =>
  c.json({ turnstile_site_key: c.env.TURNSTILE_SITE_KEY || null, amount_paise: PRODUCT.amountPaise, currency: PRODUCT.currency, support_email: c.env.SUPPORT_EMAIL }),
);

app.post("/api/checkout", async (c) => {
  if (!(await allow(c.env, "CHECKOUT_LIMITER", ip(c)))) return c.json({ error: "Too many attempts. Try again in a minute." }, 429);
  const b = await parse(c, checkoutSchema);
  if (!b) return c.json({ error: "Enter a valid email and accept the terms." }, 400);
  if (!(await verifyTurnstile(b.turnstile_token, c.env.TURNSTILE_SECRET, ip(c)))) return c.json({ error: "Bot check failed" }, 403);

  const now = nowSec();
  const reply = async (orderId: string, rzpOrderId: string) =>
    c.json({
      key_id: c.env.RAZORPAY_KEY_ID, razorpay_order_id: rzpOrderId, order_id: orderId,
      token: await orderToken(orderId, c.env.ORDER_TOKEN_SECRET),
      amount: PRODUCT.amountPaise, currency: PRODUCT.currency, name: PRODUCT.name,
      prefill: { email: b.email, name: b.name || "" },
    });
  const openOrder = (customerId: string) =>
    c.env.DB.prepare("SELECT id, razorpay_order_id FROM orders WHERE customer_id = ? AND status = 'pending'").bind(customerId).first<{ id: string; razorpay_order_id: string }>();

  const known = await c.env.DB.prepare("SELECT id FROM customers WHERE email = ?").bind(b.email).first<{ id: string }>();
  if (known) {
    const paid = await c.env.DB.prepare("SELECT 1 AS x FROM orders WHERE customer_id = ? AND status = 'paid'").bind(known.id).first();
    if (paid) return c.json({ code: "already_purchased", error: "This email already has Capturita Pro. Contact support to get your license key again." }, 409);
    await c.env.DB.prepare("UPDATE orders SET status = 'expired' WHERE customer_id = ? AND status = 'pending' AND created_at <= ?").bind(known.id, now - OPEN_ORDER_SECONDS).run();
    const open = await openOrder(known.id); // double click / reopened dialog: reuse, never a second order
    if (open) return reply(open.id, open.razorpay_order_id);
  }

  const orderId = newId("ord");
  let rzp;
  try {
    rzp = await new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET).createOrder({
      amount: PRODUCT.amountPaise, receipt: orderId, notes: { order_id: orderId, product: PRODUCT.id },
    });
  } catch (e) {
    console.error("createOrder failed", (e as Error).message);
    return c.json({ error: "Payments are unavailable right now. Please try again shortly." }, 502);
  }

  const cust = await c.env.DB.prepare(
    "INSERT INTO customers (id, email, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, customers.name) RETURNING id",
  ).bind(newId("cust"), b.email, b.name || null, now).first<{ id: string }>();
  try {
    await c.env.DB.prepare(
      "INSERT INTO orders (id, customer_id, razorpay_order_id, amount_paise, currency, terms_accepted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(orderId, cust!.id, rzp.id, PRODUCT.amountPaise, PRODUCT.currency, now, now).run();
  } catch (e) {
    // Lost a race with a concurrent checkout (unique open order per buyer): use the winner's.
    const open = await openOrder(cust!.id);
    if (!open) throw e;
    return reply(open.id, open.razorpay_order_id);
  }
  return reply(orderId, rzp.id);
});

// Desktop app: take or refresh a seat. Called at activation and about daily; the signed token it returns is the offline grace.
app.post("/api/licenses/activate", async (c) => {
  if (!(await allow(c.env, "LICENSE_LIMITER", ip(c)))) return c.json({ error: "Too many attempts. Try again in a minute." }, 429);
  const b = await parse(c, activateSchema);
  if (!b) return c.json({ error: "Invalid request" }, 400);
  const r = await activate(c.env, b.key, b.device_id, b.device_name);
  return r.ok ? c.json(r) : c.json({ code: r.code, devices: r.devices }, r.status);
});

app.post("/api/licenses/deactivate", async (c) => {
  if (!(await allow(c.env, "LICENSE_LIMITER", ip(c)))) return c.json({ error: "Too many attempts. Try again in a minute." }, 429);
  const b = await parse(c, deactivateSchema);
  if (!b) return c.json({ error: "Invalid request" }, 400);
  return c.json({ ok: await deactivate(c.env, b.key, b.target) });
});

// Lost key: shown only to someone who knows both the purchase email and the Razorpay payment id from the receipt (no email service needed).
app.post("/api/licenses/recover", async (c) => {
  const b = await parse(c, recoverSchema);
  if (!b) return c.json({ error: "Enter the purchase email and the payment ID from your Razorpay receipt." }, 400);
  if (!(await allow(c.env, "LICENSE_LIMITER", ip(c))) || !(await allow(c.env, "LICENSE_LIMITER", `recover:${b.email}`))) return c.json({ error: "Too many attempts. Try again in a minute." }, 429);
  if (!(await verifyTurnstile(b.turnstile_token, c.env.TURNSTILE_SECRET, ip(c)))) return c.json({ error: "Bot check failed" }, 403);
  const row = await c.env.DB.prepare(
    "SELECT l.key FROM licenses l JOIN orders o ON o.id = l.order_id JOIN customers cu ON cu.id = l.customer_id WHERE cu.email = ? AND o.razorpay_payment_id = ? AND l.status = 'active'",
  ).bind(b.email, b.payment_id).first<{ key: string }>();
  return row ? c.json({ license_key: row.key }) : c.json({ error: "No active license matches that email and payment ID." }, 404);
});

app.post("/api/payments/verify", async (c) => {
  const b = await parse(c, verifySchema);
  if (!b) return c.json({ error: "Invalid request" }, 400);
  const rzp = new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET);
  if (!(await rzp.verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature))) return c.json({ error: "Invalid payment signature" }, 400);
  const o = await c.env.DB.prepare("SELECT id FROM orders WHERE razorpay_order_id = ?").bind(b.razorpay_order_id).first<{ id: string }>();
  if (!o) return c.json({ error: "Order not found" }, 404);
  const done = async () => c.json({ order_id: o.id, token: await orderToken(o.id, c.env.ORDER_TOKEN_SECRET) });
  try {
    // Amount, currency and order are read from Razorpay, not trusted from the browser.
    const p = await rzp.fetchPayment(b.razorpay_payment_id);
    if (p.order_id !== b.razorpay_order_id) return c.json({ error: "Payment does not match order" }, 400);
    if (p.status === "captured") await fulfillOrder(c.env, { id: p.id, orderId: p.order_id, amount: p.amount, currency: p.currency, method: p.method });
  } catch (e) {
    if (e instanceof PermanentError) return c.json({ error: "Payment does not match order" }, 400);
    // Transient: the webhook will fulfil it and the success page keeps polling.
    console.error("verify fulfil failed", (e as Error).message);
  }
  return done();
});

app.post("/api/webhooks/razorpay", async (c) =>
  handleWebhook(c.env, await c.req.text(), c.req.header("x-razorpay-signature"), c.req.header("x-razorpay-event-id")),
);

// The key is returned only with this order's secret token (handed out at checkout / verify).
app.get("/api/orders/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await checkOrderToken(id, c.req.query("t") ?? "", c.env.ORDER_TOKEN_SECRET))) return c.json({ error: "Not found" }, 404);
  const o = await c.env.DB.prepare(
    `SELECT o.status, o.amount_paise, o.currency, o.paid_at, o.razorpay_payment_id, cu.email, cu.name, l.key, l.status AS license_status,
       (SELECT COUNT(*) FROM activations a WHERE a.license_id = l.id AND a.deactivated_at IS NULL) AS devices
     FROM orders o JOIN customers cu ON cu.id = o.customer_id LEFT JOIN licenses l ON l.order_id = o.id WHERE o.id = ?`,
  ).bind(id).first<{ status: string; amount_paise: number; currency: string; paid_at: number | null; razorpay_payment_id: string | null; email: string; name: string | null; key: string | null; license_status: string | null }>();
  if (!o) return c.json({ error: "Not found" }, 404);
  const receipt = o.paid_at ? { order_id: id, payment_id: o.razorpay_payment_id, email: o.email, name: o.name, amount_paise: o.amount_paise, currency: o.currency, paid_at: o.paid_at } : null;
  return c.json({ status: o.status, license_key: o.license_status === "active" ? o.key : null, receipt });
});

// Admin: bearer ADMIN_TOKEN, constant-time. Unset token rejects everything.
app.use("/api/admin/*", async (c, next) => {
  if (!(await allow(c.env, "LICENSE_LIMITER", `admin:${ip(c)}`))) return c.json({ error: "Too many attempts" }, 429); // slows token guessing
  const t = c.env.ADMIN_TOKEN;
  const given = (c.req.header("authorization") || "").replace(/^Bearer /i, "");
  if (!t || !given || !(await safeEqual(given, t))) return c.json({ error: "Unauthorized" }, 401);
  await next();
});

app.get("/api/admin/orders", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT o.id, c.email, c.name, o.amount_paise, o.status, o.created_at, o.paid_at, o.refunded_at, p.id AS payment_id, l.status AS license_status
     FROM orders o JOIN customers c ON c.id = o.customer_id
     LEFT JOIN payments p ON p.order_id = o.id LEFT JOIN licenses l ON l.order_id = o.id
     WHERE o.status != 'pending' ORDER BY o.created_at DESC LIMIT 50`,
  ).all();
  const flagged = await c.env.DB.prepare("SELECT id AS payment_id, order_id, amount_paise FROM payments WHERE status = 'needs_refund'").all();
  return c.json({ orders: results, duplicate_payments_needing_refund: flagged.results });
});

app.post("/api/admin/refund", async (c) => {
  const b = await parse(c, refundSchema);
  if (!b) return c.json({ error: "orderId required" }, 400);
  try {
    return c.json({ ok: true, ...(await refundOrder(c.env, b.orderId, b.reason)) });
  } catch (e) {
    if (e instanceof RefundError) return c.json({ error: e.message }, e.status);
    throw e;
  }
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((e, c) => {
  console.error("unhandled", e.message);
  return c.json({ error: "Server error" }, 500);
});

export default app;
