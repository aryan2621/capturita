import { generateKeyPairSync } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { vi } from "vitest";
import type { Env } from "../worker/types";
import { hmacSha256Hex } from "../worker/crypto";

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

/** Minimal D1 look-alike over node:sqlite, running the real migration. batch() is a transaction like D1's. */
export function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readdirSync(new URL("../migrations/", import.meta.url)).sort().map((f) => readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8")).join("\n"));
  const clean = (a: unknown[]) => a.map((v) => (v === undefined ? null : v)) as any[];
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    first: async () => (db.prepare(sql).get(...clean(args)) as any) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...clean(args)) as any[] }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...clean(args)).changes) } }),
    sync: () => ({ meta: { changes: Number(db.prepare(sql).run(...clean(args)).changes) } }),
  });
  return {
    raw: db,
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: ReturnType<typeof stmt>[]) => {
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => s.sync());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database & { raw: InstanceType<typeof DatabaseSync> };
}

export const ENV_SECRETS = { RAZORPAY_KEY_SECRET: "key_secret", RAZORPAY_WEBHOOK_SECRET: "whsec", ORDER_TOKEN_SECRET: "order_secret", ADMIN_TOKEN: "admin-token-123" };

export function makeEnv(over: Partial<Env> = {}) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ type: "spki", format: "der" });
  return {
    DB: makeDb(),
    SITE_URL: "https://site.test", SUPPORT_EMAIL: "support@site.test",
    RAZORPAY_KEY_ID: "rzp_test_x",
    LICENSE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    LICENSE_PUBLIC_KEY_RAW: spki.subarray(spki.length - 32).toString("base64"),
    ...ENV_SECRETS, ...over,
  } as Env & { DB: ReturnType<typeof makeDb> };
}

export interface Net { refunds: any[]; ordersCreated: number; payment: any; refundOk: boolean }

/** Stubs global fetch for Razorpay. Nothing real is contacted. */
export function mockNet(): Net {
  const net: Net = { refunds: [], ordersCreated: 0, payment: null, refundOk: true };
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const u = String(url);
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
    if (u.endsWith("/orders")) return json({ id: `order_${++net.ordersCreated}`, amount: body.amount, currency: "INR" });
    if (u.endsWith("/refund")) {
      net.refunds.push({ url: u, body });
      return net.refundOk ? json({ id: "rfnd_1", status: "processed" }) : json({ error: { description: "nope" } }, 400);
    }
    if (u.includes("/payments/")) return json(net.payment);
    throw new Error(`unexpected fetch ${u}`);
  });
  return net;
}

export const addOrder = async (env: Env, o: { id?: string; rzp?: string; email?: string; status?: string; createdAt?: number; amount?: number } = {}) => {
  const email = o.email ?? "buyer@test.dev";
  await env.DB.prepare("INSERT OR IGNORE INTO customers (id, email, created_at) VALUES (?, ?, 1)").bind(`cust_${email}`, email).run();
  const c = await env.DB.prepare("SELECT id FROM customers WHERE email = ?").bind(email).first<{ id: string }>();
  await env.DB.prepare("INSERT INTO orders (id, customer_id, razorpay_order_id, amount_paise, status, terms_accepted_at, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
    .bind(o.id ?? "ord_1", c!.id, o.rzp ?? "order_A", o.amount ?? 99900, o.status ?? "pending", o.createdAt ?? Math.floor(Date.now() / 1000)).run();
};

export const pay = (id = "pay_1", over: Record<string, unknown> = {}) => ({ id, orderId: "order_A", amount: 99900, currency: "INR", method: "upi", ...over });
export const count = (env: Env, table: string) => (env.DB as any).raw.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n as number;

export async function signedWebhook(env: Env, event: object, id: string, secret = env.RAZORPAY_WEBHOOK_SECRET) {
  const body = JSON.stringify(event);
  return { method: "POST", body, headers: { "x-razorpay-signature": await hmacSha256Hex(body, secret), "x-razorpay-event-id": id, "content-type": "application/json" } };
}
export const captured = (id = "pay_1", over: Record<string, unknown> = {}) => ({
  event: "payment.captured",
  payload: { payment: { entity: { id, order_id: "order_A", amount: 99900, currency: "INR", status: "captured", method: "upi", ...over } } },
});
