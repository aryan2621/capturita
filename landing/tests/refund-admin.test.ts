import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../worker/index";
import { handleWebhook } from "../worker/webhooks";
import { refundOrder, RefundError } from "../worker/refund";
import { withinRefundWindow } from "../worker/product";
import { fulfillOrder } from "../worker/fulfill";
import { addOrder, makeEnv, mockNet, pay, signedWebhook, type Net } from "./helpers";

let env: ReturnType<typeof makeEnv>;
let net: Net;
beforeEach(async () => { env = makeEnv(); net = mockNet(); await addOrder(env); });
afterEach(() => vi.unstubAllGlobals());
const D = 86400;

describe("refund window", () => {
  it("day 14 ok, day 15 rejected", () => {
    expect(withinRefundWindow(1000, 1000 + 14 * D)).toBe(true);
    expect(withinRefundWindow(1000, 1000 + 15 * D)).toBe(false);
  });
});

describe("refundOrder", () => {
  it("refunds in full, revokes the license (also after the webhook)", async () => {
    await fulfillOrder(env, pay());
    const r = await refundOrder(env, "ord_1", "asked");
    expect(r.refundId).toBe("rfnd_1");
    expect(net.refunds[0].body.amount).toBe(99900);
    expect(env.DB.raw.prepare("SELECT status FROM licenses").get()).toEqual({ status: "revoked" });
    const ev = { event: "refund.processed", payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_1", amount: 99900 } } } };
    const res = await handleWebhook(env, ...(await args(ev, "e_r")));
    expect(res.status).toBe(200);
    await expect(refundOrder(env, "ord_1")).rejects.toBeInstanceOf(RefundError); // already refunded
  });
  it("rejects day 15 and unpaid orders", async () => {
    await fulfillOrder(env, pay());
    const paidAt = (env.DB.raw.prepare("SELECT paid_at p FROM orders").get() as any).p;
    await expect(refundOrder(env, "ord_1", undefined, paidAt + 15 * D)).rejects.toMatchObject({ status: 409 });
    await expect(refundOrder(env, "ord_1", undefined, paidAt + 14 * D)).resolves.toBeTruthy();
    await expect(refundOrder(env, "ord_nope")).rejects.toMatchObject({ status: 404 });
  });
  it("refund of a duplicate payment does not revoke the real license", async () => {
    await fulfillOrder(env, pay("pay_1"));
    await fulfillOrder(env, pay("pay_2")); // auto-refunded duplicate
    const ev = { event: "refund.processed", payload: { refund: { entity: { id: "rfnd_9", payment_id: "pay_2", amount: 99900 } } } };
    await handleWebhook(env, ...(await args(ev, "e_d")));
    expect(env.DB.raw.prepare("SELECT status FROM licenses").get()).toEqual({ status: "active" });
  });
});

async function args(ev: object, id: string): Promise<[string, string, string]> {
  const r = await signedWebhook(env, ev, id);
  return [r.body, r.headers["x-razorpay-signature"], id];
}

describe("admin auth", () => {
  const call = (path: string, headers: Record<string, string> = {}, e = env, method = "GET", body?: object) =>
    app.request(path, { method, headers: { "content-type": "application/json", ...headers }, body: body && JSON.stringify(body) }, e);
  it("missing / wrong token -> 401, right token -> 200", async () => {
    expect((await call("/api/admin/orders")).status).toBe(401);
    expect((await call("/api/admin/orders", { authorization: "Bearer nope" })).status).toBe(401);
    expect((await call("/api/admin/refund", { authorization: "Bearer nope" }, env, "POST", { orderId: "ord_1" })).status).toBe(401);
    expect((await call("/api/admin/orders", { authorization: "Bearer admin-token-123" })).status).toBe(200);
  });
  it("unset ADMIN_TOKEN rejects everything", async () => {
    const e = makeEnv({ ADMIN_TOKEN: undefined });
    expect((await call("/api/admin/orders", { authorization: "Bearer " }, e)).status).toBe(401);
    expect((await call("/api/admin/orders", { authorization: "Bearer undefined" }, e)).status).toBe(401);
  });
  it("refund endpoint works with the token", async () => {
    await fulfillOrder(env, pay());
    const r = await call("/api/admin/refund", { authorization: "Bearer admin-token-123" }, env, "POST", { orderId: "ord_1" });
    expect(r.status).toBe(200);
  });
});
