import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { hmacSha256Hex, safeEqual, checkOrderToken, orderToken } from "../worker/crypto";
import { verifyWebhookSignature, RazorpayClient } from "../worker/razorpay";
import { signLicense, verifyLicense } from "../worker/license";
import { fetchT } from "../worker/http";
import { vi } from "vitest";

describe("HMAC verification", () => {
  it("webhook: valid, tampered body, wrong secret", async () => {
    const body = '{"event":"payment.captured"}';
    const sig = await hmacSha256Hex(body, "s");
    expect(await verifyWebhookSignature(body, sig, "s")).toBe(true);
    expect(await verifyWebhookSignature(body + " ", sig, "s")).toBe(false);
    expect(await verifyWebhookSignature(body, sig, "other")).toBe(false);
    expect(await verifyWebhookSignature(body, "", "s")).toBe(false);
  });
  it("checkout signature: valid, tampered, wrong secret", async () => {
    const sig = await hmacSha256Hex("order_1|pay_1", "k");
    expect(await new RazorpayClient("id", "k").verifyPaymentSignature("order_1", "pay_1", sig)).toBe(true);
    expect(await new RazorpayClient("id", "k").verifyPaymentSignature("order_1", "pay_2", sig)).toBe(false);
    expect(await new RazorpayClient("id", "x").verifyPaymentSignature("order_1", "pay_1", sig)).toBe(false);
  });
  it("safeEqual and order tokens", async () => {
    expect(await safeEqual("a", "a")).toBe(true);
    expect(await safeEqual("a", "ab")).toBe(false);
    const t = await orderToken("ord_1", "sec");
    expect(await checkOrderToken("ord_1", t, "sec")).toBe(true);
    expect(await checkOrderToken("ord_2", t, "sec")).toBe(false);
    expect(await checkOrderToken("ord_1", "", "sec")).toBe(false);
    expect(await checkOrderToken("ord_1", t, "other")).toBe(false);
    expect(await checkOrderToken("ord_1", t, "sec", Math.floor(Date.now() / 1000) + 8 * 86400)).toBe(false); // expired
    expect(await checkOrderToken("ord_1", t.replace(/^\d+/, "99999999999"), "sec")).toBe(false); // expiry can't be extended
  });
});

describe("license", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const priv = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  const spki = publicKey.export({ type: "spki", format: "der" });
  const raw = spki.subarray(spki.length - 32).toString("base64");
  const payload = { v: 1, lic: "lic_1", product: "capturita", email: "a@b.c", plan: "pro", seats: 1, issued: 1, updates_until: 4_000_000_000, expires: null, kid: "v1" };

  it("sign + verify round trip (raw and SPKI public key)", async () => {
    const key = await signLicense(payload, priv);
    expect(key.split(".")).toHaveLength(2);
    expect((await verifyLicense(key, "capturita", raw)).valid).toBe(true);
    expect((await verifyLicense(key, "capturita", spki.toString("base64"))).valid).toBe(true);
  });
  it("rejects tampering, wrong product and elapsed updates", async () => {
    const key = await signLicense(payload, priv);
    const [p, s] = key.split(".");
    const forged = btoa(atob(p).replace("a@b.c", "x@y.z")) + "." + s;
    expect((await verifyLicense(forged, "capturita", raw)).valid).toBe(false);
    expect((await verifyLicense(key, "other", raw)).valid).toBe(false);
    expect((await verifyLicense(key, "capturita", raw, 4_000_000_001)).valid).toBe(false);
  });
});

describe("fetchT", () => {
  it("aborts a hanging upstream", async () => {
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener("abort", () => rej(new Error("aborted")))));
    await expect(fetchT("https://x.test", {}, 20)).rejects.toThrow("aborted");
    vi.unstubAllGlobals();
  });
});
