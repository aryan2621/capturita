import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../worker/index";
import { fulfillOrder } from "../worker/fulfill";
import { activate, deactivate, MAX_DEVICES } from "../worker/activation";
import { addOrder, makeEnv, mockNet, pay } from "./helpers";

const dev = (n: number) => String(n).repeat(64).slice(0, 64).replace(/./g, String(n));
let env: ReturnType<typeof makeEnv>;
afterEach(() => vi.unstubAllGlobals());
let key: string;
const post = (path: string, body: unknown, e = env) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, e);

beforeEach(async () => {
  env = makeEnv(); mockNet();
  await addOrder(env);
  key = (await fulfillOrder(env, pay())).licenseKey!;
});

describe("device activation", () => {
  it("allows MAX_DEVICES, refuses the next, and refreshing a known device is free", async () => {
    for (let i = 1; i <= MAX_DEVICES; i++) expect((await activate(env, key, dev(i))).ok).toBe(true);
    const third = await activate(env, key, dev(9));
    expect(third).toMatchObject({ ok: false, status: 409, code: "seat_limit" });
    expect(third.ok === false && third.devices).toHaveLength(MAX_DEVICES);
    expect((await activate(env, key, dev(1))).ok).toBe(true);
  });

  it("deactivating by activation id frees a seat for a new device", async () => {
    const first = await activate(env, key, dev(1));
    await activate(env, key, dev(2));
    expect(await deactivate(env, key, first.ok ? first.activation_id : "")).toBe(true);
    expect((await activate(env, key, dev(3))).ok).toBe(true);
    expect((await activate(env, key, dev(1))).ok).toBe(false); // seats are full again
  });

  it("rejects unknown keys and revoked licenses", async () => {
    expect(await activate(env, "x".repeat(40), dev(1))).toMatchObject({ ok: false, code: "invalid_key" });
    env.DB.raw.prepare("UPDATE licenses SET status = 'revoked'").run();
    expect(await activate(env, key, dev(1))).toMatchObject({ ok: false, status: 403, code: "revoked" });
  });

  it("HTTP: validates input and never leaks the key", async () => {
    expect((await post("/api/licenses/activate", { key, device_id: "short" })).status).toBe(400);
    const ok = await post("/api/licenses/activate", { key, device_id: dev(1) });
    expect(ok.status).toBe(200);
    expect(JSON.stringify(await ok.json())).not.toContain(key);
    expect((await post("/api/licenses/activate", { key: "y".repeat(40), device_id: dev(1) })).status).toBe(404);
  });
});

describe("key recovery", () => {
  const recover = (email: string, payment_id: string) => post("/api/licenses/recover", { email, payment_id });
  it("returns the key only for the matching email and payment id", async () => {
    const ok = await recover("buyer@test.dev", "pay_1");
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as any).license_key).toBe(key);
    expect((await recover("buyer@test.dev", "pay_2")).status).toBe(404);
    expect((await recover("other@test.dev", "pay_1")).status).toBe(404);
    expect((await recover("buyer@test.dev", "nope")).status).toBe(400);
  });
  it("refuses a refunded license", async () => {
    env.DB.raw.prepare("UPDATE licenses SET status = 'revoked'").run();
    expect((await recover("buyer@test.dev", "pay_1")).status).toBe(404);
  });
});

describe("admin", () => {
  it("is rate limited before the token is checked", async () => {
    const e2 = makeEnv({ LICENSE_LIMITER: { limit: async () => ({ success: false }) } as any });
    expect((await app.request("/api/admin/orders", { headers: { authorization: "Bearer wrong" } }, e2)).status).toBe(429);
  });
});
