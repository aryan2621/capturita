import type { Env } from "./types";
import { newId, nowSec } from "./product";
import { signLicense } from "./license";

export const MAX_DEVICES = 2;
/** The app treats a token as valid offline until it expires: this is the offline grace period. */
export const ACTIVATION_TTL = 30 * 86400;

export type ActivateResult =
  | { ok: true; token: string; expires_at: number; activation_id: string; devices: number; max_devices: number }
  | { ok: false; status: 403 | 404 | 409; code: "invalid_key" | "revoked" | "seat_limit"; devices?: { activation_id: string; name: string | null; last_seen_at: number }[] };

const active = "license_id = ? AND deactivated_at IS NULL";

/** Idempotent: first call on a device takes a seat, later calls refresh the token. */
export async function activate(env: Env, key: string, deviceId: string, deviceName?: string): Promise<ActivateResult> {
  const lic = await env.DB.prepare("SELECT id, status FROM licenses WHERE key = ?").bind(key).first<{ id: string; status: string }>();
  if (!lic) return { ok: false, status: 404, code: "invalid_key" };
  if (lic.status !== "active") return { ok: false, status: 403, code: "revoked" };

  const now = nowSec();
  const existing = await env.DB.prepare("SELECT id, deactivated_at FROM activations WHERE license_id = ? AND device_id = ?").bind(lic.id, deviceId).first<{ id: string; deactivated_at: number | null }>();
  let actId = existing?.id;
  if (existing && !existing.deactivated_at) {
    await env.DB.prepare("UPDATE activations SET last_seen_at = ?, device_name = COALESCE(?, device_name) WHERE id = ?").bind(now, deviceName ?? null, existing.id).run();
  } else {
    // The count check lives inside the write so two devices racing for the last seat cannot both win.
    const taken = `(SELECT COUNT(*) FROM activations WHERE ${active}) < ?`;
    let changes = 0;
    try {
      changes = existing
        ? (await env.DB.prepare(`UPDATE activations SET deactivated_at = NULL, last_seen_at = ?, device_name = COALESCE(?, device_name) WHERE id = ? AND ${taken}`).bind(now, deviceName ?? null, existing.id, lic.id, MAX_DEVICES).run()).meta.changes
        : (actId = newId("act"), (await env.DB.prepare(`INSERT INTO activations (id, license_id, device_id, device_name, activated_at, last_seen_at) SELECT ?, ?, ?, ?, ?, ? WHERE ${taken}`).bind(actId, lic.id, deviceId, deviceName ?? null, now, now, lic.id, MAX_DEVICES).run()).meta.changes);
    } catch {
      changes = 0; // unique violation: the same device raced itself
    }
    if (!changes) {
      const { results } = await env.DB.prepare(`SELECT id AS activation_id, device_name AS name, last_seen_at FROM activations WHERE ${active} ORDER BY last_seen_at DESC`).bind(lic.id).all<{ activation_id: string; name: string | null; last_seen_at: number }>();
      return { ok: false, status: 409, code: "seat_limit", devices: results };
    }
  }
  const expires_at = now + ACTIVATION_TTL;
  const token = await signLicense({ typ: "activation", lic: lic.id, dev: deviceId, iat: now, exp: expires_at }, env.LICENSE_PRIVATE_KEY);
  const used = await env.DB.prepare(`SELECT COUNT(*) AS n FROM activations WHERE ${active}`).bind(lic.id).first<{ n: number }>();
  return { ok: true, token, expires_at, activation_id: actId!, devices: used?.n ?? 1, max_devices: MAX_DEVICES };
}

/** Frees a seat. `target` is the device hash (own device) or an activation id (a device you cannot reach). */
export async function deactivate(env: Env, key: string, target: string): Promise<boolean> {
  const res = await env.DB.prepare(
    "UPDATE activations SET deactivated_at = ? WHERE deactivated_at IS NULL AND (id = ? OR device_id = ?) AND license_id = (SELECT id FROM licenses WHERE key = ?)",
  ).bind(nowSec(), target, target, key).run();
  return res.meta.changes > 0;
}
