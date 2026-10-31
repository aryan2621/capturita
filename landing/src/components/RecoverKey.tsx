import { useState, type FormEvent } from "react";
import { postJson } from "../api";
import { useTurnstile } from "../useTurnstile";
import { btnPrimary } from "./ui";

const field = "mt-1 block min-h-11 w-full rounded-xl border border-border bg-card px-3 text-base";

/** Lost key: the purchase email plus the payment ID from the Razorpay receipt. */
export function RecoverKey() {
  const [form, setForm] = useState({ email: "", payment: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const { siteKey, token, box, fresh } = useTurnstile(setError);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await postJson("/api/licenses/recover", { email: form.email, payment_id: form.payment.trim(), turnstile_token: token || undefined });
      if (res.ok) setKey(res.data.license_key);
      else { fresh(); setError(res.data.error || "Something went wrong. Please try again."); }
    } catch {
      fresh();
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (key) return (
    <div className="space-y-2">
      <p>Your Pro key:</p>
      <textarea readOnly rows={4} value={key} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-sm`} />
      <p className="muted text-sm">Paste it in Capturita under Settings → License. It works on up to 2 Macs.</p>
    </div>
  );
  return (
    <form onSubmit={submit} className="max-w-md space-y-3 not-prose">
      <label className="block text-sm font-medium">Purchase email
        <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} />
      </label>
      <label className="block text-sm font-medium">Payment ID <span className="font-normal text-muted-foreground">(starts with pay_, in your Razorpay receipt)</span>
        <input type="text" required pattern="pay_\w+" autoComplete="off" spellCheck={false} value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} className={field} />
      </label>
      <div ref={box} />
      <p role="alert" className="min-h-5 text-sm text-destructive">{error}</p>
      <button type="submit" disabled={busy || (!!siteKey && !token)} className={`${btnPrimary} disabled:opacity-60`}>{busy ? "Checking…" : siteKey && !token ? "Checking…" : "Show my key"}</button>
    </form>
  );
}
