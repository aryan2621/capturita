// Usage: WORKER_URL=https://... ADMIN_TOKEN=... node scripts/refund.mjs <orderId> [reason]
const [orderId, ...reason] = process.argv.slice(2);
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!orderId || !WORKER_URL || !ADMIN_TOKEN) {
  console.error("Usage: WORKER_URL=... ADMIN_TOKEN=... node scripts/refund.mjs <orderId> [reason]");
  process.exit(1);
}
const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/api/admin/refund`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ orderId, reason: reason.join(" ") || undefined }),
});
console.log(res.status, await res.text());
process.exit(res.ok ? 0 : 1);
