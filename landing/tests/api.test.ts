import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../worker/index";
import { hmacSha256Hex } from "../worker/crypto";
import { addOrder, captured, count, makeEnv, mockNet, pay, signedWebhook, type Net } from "./helpers";
import { fulfillOrder } from "../worker/fulfill";

let env: ReturnType<typeof makeEnv>;
let net: Net;
beforeEach(() => { env = makeEnv(); net = mockNet(); });
afterEach(() => vi.unstubAllGlobals());

const post = (path: string, body: unknown, e = env, headers: Record<string, string> = {}) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }, e);
const checkout = (email = "buyer@test.dev", e = env) => post("/api/checkout", { email, accepted_terms: true }, e);
const hook = async (ev: object, id: string, secret?: string) => app.request("/api/webhooks/razorpay", await signedWebhook(env, ev, id, secret), env);

describe("checkout", () => {
  it("validates input", async () => {
    expect((await post("/api/checkout", { email: "nope", accepted_terms: true })).status).toBe(400);
    expect((await post("/api/checkout", { email: "a@b.co", accepted_terms: false })).status).toBe(400);
  });
  it("is idempotent: repeat and concurrent calls reuse one open Razorpay order", async () => {
    const [a, b] = await Promise.all([checkout(), checkout()]);
    const c = await checkout();
    const ids = await Promise.all([a, b, c].map(async (r) => (await r.json() as any).order_id));
    expect(new Set(ids).size).toBe(1);
    expect(count(env, "orders")).toBe(1);
  });
  it("a stale open order (over 30 min) is replaced by a fresh one", async () => {
    const r1 = (await (await checkout()).json()) as any;
    env.DB.raw.prepare("UPDATE orders SET created_at = created_at - 3600").run();
    const r2 = (await (await checkout()).json()) as any;
    expect(r2.order_id).not.toBe(r1.order_id);
    expect(env.DB.raw.prepare("SELECT status FROM orders WHERE id = ?").get(r1.order_id)).toEqual({ status: "expired" });
  });
  it("refuses a buyer who already has a paid license; allows after refund", async () => {
    await addOrder(env);
    await fulfillOrder(env, pay());
    const r = await checkout();
    expect(r.status).toBe(409);
    expect(((await r.json()) as any).error).toContain("Contact support");
    env.DB.raw.prepare("UPDATE orders SET status = 'refunded'").run();
    expect((await checkout()).status).toBe(200);
  });
  it("a late webhook for an expired order still fulfils it", async () => {
    const r1 = (await (await checkout()).json()) as any;
    env.DB.raw.prepare("UPDATE orders SET created_at = 1").run();
    await checkout(); // expires the old one
    const res = await hook(captured("pay_1", { order_id: r1.razorpay_order_id }), "evt_late");
    expect(res.status).toBe(200);
    expect(count(env, "licenses")).toBe(1);
  });
});

describe("verify", () => {
  it("rejects a bad signature, fulfils a good one with amount checked against Razorpay", async () => {
    await addOrder(env);
    const bad = { razorpay_order_id: "order_A", razorpay_payment_id: "pay_1", razorpay_signature: "0".repeat(64) };
    expect((await post("/api/payments/verify", bad)).status).toBe(400);
    const sig = await hmacSha256Hex("order_A|pay_1", env.RAZORPAY_KEY_SECRET);
    net.payment = { id: "pay_1", order_id: "order_A", amount: 100, currency: "INR", status: "captured" };
    expect((await post("/api/payments/verify", { ...bad, razorpay_signature: sig })).status).toBe(400); // amount mismatch
    expect(count(env, "licenses")).toBe(0);
    net.payment.amount = 99900;
    const ok = await post("/api/payments/verify", { ...bad, razorpay_signature: sig });
    expect(ok.status).toBe(200);
    expect(count(env, "licenses")).toBe(1);
  });
  it("verify and webhook racing -> one license", async () => {
    await addOrder(env);
    const sig = await hmacSha256Hex("order_A|pay_1", env.RAZORPAY_KEY_SECRET);
    net.payment = { id: "pay_1", order_id: "order_A", amount: 99900, currency: "INR", status: "captured" };
    await Promise.all([
      post("/api/payments/verify", { razorpay_order_id: "order_A", razorpay_payment_id: "pay_1", razorpay_signature: sig }),
      hook(captured(), "evt_1"), hook({ ...captured(), event: "order.paid" }, "evt_2"),
    ]);
    expect(count(env, "licenses")).toBe(1);
  });
});

describe("webhook responses", () => {
  beforeEach(() => addOrder(env));
  it("bad or missing signature -> 400", async () => {
    expect((await hook(captured(), "e1", "wrong")).status).toBe(400);
    expect((await app.request("/api/webhooks/razorpay", { method: "POST", body: "{}" }, env)).status).toBe(400);
  });
  it("duplicate event -> 200 already_processed; unknown event -> 200", async () => {
    expect((await hook(captured(), "e1")).status).toBe(200);
    const dup = await hook(captured(), "e1");
    expect(dup.status).toBe(200);
    expect(((await dup.json()) as any).status).toBe("already_processed");
    expect((await hook({ event: "something.else", payload: {} }, "e2")).status).toBe(200);
    expect(count(env, "licenses")).toBe(1);
  });
  it("permanent mismatch -> 200 (no endless retries); transient failure -> 500 then retry succeeds", async () => {
    expect((await hook(captured("pay_x", { amount: 5 }), "e3")).status).toBe(200);
    expect(count(env, "licenses")).toBe(0);
    const good = env.LICENSE_PRIVATE_KEY;
    env.LICENSE_PRIVATE_KEY = "!!not-a-key!!";
    expect((await hook(captured(), "e4")).status).toBe(500);
    env.LICENSE_PRIVATE_KEY = good;
    expect((await hook(captured(), "e4")).status).toBe(200); // Razorpay's retry, same event id
    expect(count(env, "licenses")).toBe(1);
  });
});


describe("orders", () => {
  it("never returns a key without the per-order token", async () => {
    const c = (await (await checkout()).json()) as any;
    await fulfillOrder(env, { id: "pay_1", orderId: c.razorpay_order_id, amount: 99900, currency: "INR" });
    expect((await app.request(`/api/orders/${c.order_id}`, {}, env)).status).toBe(404);
    expect((await app.request(`/api/orders/${c.order_id}?t=guess`, {}, env)).status).toBe(404);
    const ok = (await (await app.request(`/api/orders/${c.order_id}?t=${c.token}`, {}, env)).json()) as any;
    expect(ok.status).toBe("paid");
    expect(ok.license_key).toContain(".");
  });
  it("rejects cross-origin browser POSTs", async () => {
    const r = await post("/api/checkout", { email: "a@b.co", accepted_terms: true }, env, { origin: "https://evil.test" });
    expect(r.status).toBe(403);
  });
});
