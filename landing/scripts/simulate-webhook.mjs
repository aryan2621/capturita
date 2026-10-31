// Posts a correctly signed fake payment.captured to a local worker.
// Usage: RAZORPAY_WEBHOOK_SECRET=... node scripts/simulate-webhook.mjs <razorpayOrderId> [amountPaise] [WORKER_URL]
// Create the order first via POST /api/checkout (it needs real test keys), or insert a pending row into local D1.
import crypto from "node:crypto";

const [rzpOrderId, amount = "99900", url = process.env.WORKER_URL || "http://localhost:8787"] = process.argv.slice(2);
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!rzpOrderId || !secret) {
  console.error("Usage: RAZORPAY_WEBHOOK_SECRET=... node scripts/simulate-webhook.mjs <razorpayOrderId> [amountPaise] [WORKER_URL]");
  process.exit(1);
}
const payId = `pay_sim${crypto.randomBytes(6).toString("hex")}`;
const body = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: payId, order_id: rzpOrderId, amount: Number(amount), currency: "INR", status: "captured", method: "upi" } } },
});
const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
const res = await fetch(`${url}/api/webhooks/razorpay`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Razorpay-Signature": sig, "X-Razorpay-Event-Id": `evt_sim${Date.now()}` },
  body,
});
console.log(res.status, await res.text(), payId);
