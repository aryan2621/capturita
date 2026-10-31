import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fulfillOrder, PermanentError } from "../worker/fulfill";
import { verifyLicense } from "../worker/license";
import { addOrder, count, makeEnv, mockNet, pay, type Net } from "./helpers";

let env: ReturnType<typeof makeEnv>;
let net: Net;
beforeEach(async () => { env = makeEnv(); net = mockNet(); await addOrder(env); });
afterEach(() => vi.unstubAllGlobals());

describe("fulfil", () => {
  it("issues a key the desktop checker accepts", async () => {
    const r = await fulfillOrder(env, pay());
    expect((await verifyLicense(r.licenseKey!, "capturita", env.LICENSE_PUBLIC_KEY_RAW!)).valid).toBe(true);
  });
  it("same payment twice in sequence -> one license", async () => {
    for (let i = 0; i < 4; i++) await fulfillOrder(env, pay());
    expect(count(env, "licenses")).toBe(1);
  });
  it("webhook and verify racing concurrently -> one license, same key", async () => {
    const rs = await Promise.all(Array.from({ length: 6 }, () => fulfillOrder(env, pay())));
    expect(count(env, "licenses")).toBe(1);
    expect(count(env, "payments")).toBe(1);
    expect(new Set(rs.map((r) => r.licenseKey)).size).toBe(1);
    expect(env.DB.raw.prepare("SELECT status FROM orders").get()).toEqual({ status: "paid" });
  });
  it("rejects amount, currency and unknown-order mismatches", async () => {
    await expect(fulfillOrder(env, pay("pay_1", { amount: 100 }))).rejects.toBeInstanceOf(PermanentError);
    await expect(fulfillOrder(env, pay("pay_1", { currency: "USD" }))).rejects.toBeInstanceOf(PermanentError);
    await expect(fulfillOrder(env, pay("pay_1", { orderId: "order_Z" }))).rejects.toBeInstanceOf(PermanentError);
    expect(count(env, "licenses")).toBe(0);
  });
  it("a second, different payment on a paid order is auto-refunded, never a second license", async () => {
    await fulfillOrder(env, pay("pay_1"));
    const r = await fulfillOrder(env, pay("pay_2"));
    expect(r.duplicate).toBe(true);
    expect(net.refunds).toHaveLength(1);
    expect(net.refunds[0].url).toContain("pay_2");
    await fulfillOrder(env, pay("pay_2")); // webhook retry: not refunded twice
    expect(net.refunds).toHaveLength(1);
    expect(count(env, "licenses")).toBe(1);
    expect(env.DB.raw.prepare("SELECT status FROM payments WHERE id='pay_2'").get()).toEqual({ status: "duplicate_refunded" });
  });
  it("two different payments racing on one order -> one license, loser refunded", async () => {
    await Promise.all([fulfillOrder(env, pay("pay_1")), fulfillOrder(env, pay("pay_2"))]);
    expect(count(env, "licenses")).toBe(1);
    expect(net.refunds).toHaveLength(1);
  });
  it("failed auto-refund is flagged for the owner", async () => {
    net.refundOk = false;
    await fulfillOrder(env, pay("pay_1"));
    await fulfillOrder(env, pay("pay_2"));
    expect(env.DB.raw.prepare("SELECT status FROM payments WHERE id='pay_2'").get()).toEqual({ status: "needs_refund" });
  });
  it("a payment arriving for an expired (stale) order still fulfils", async () => {
    const e2 = makeEnv();
    await addOrder(e2, { status: "expired", createdAt: 1 });
    expect((await fulfillOrder(e2, pay())).licenseKey).toBeTruthy();
  });
});
