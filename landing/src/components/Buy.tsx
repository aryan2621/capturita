import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, navigate } from "../router";
import { loadRazorpay, postJson } from "../api";
import { useTurnstile } from "../useTurnstile";
import { btnPrimary, btnSecondary } from "./ui";

const BuyContext = createContext<() => void>(() => {});
export const useBuy = () => useContext(BuyContext);

/** Any "Buy Pro" button. Opens the purchase dialog. */
export function BuyButton({ className = btnPrimary }: { className?: string }) {
  const open = useBuy();
  return <button type="button" onClick={open} className={className}>Buy Pro</button>;
}

const field = "mt-1 block min-h-11 w-full rounded-xl border border-border bg-card px-3 text-base";

export function BuyProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ email: "", name: "", accepted: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { siteKey, token, box, fresh } = useTurnstile(setError);
  const open = useCallback(() => { setError(""); ref.current?.showModal(); }, []);
  const close = () => ref.current?.close();
  // showModal() sits in the browser top layer, above Razorpay's window; so the dialog is closed while Razorpay is open.
  const handedOff = useRef(false);

  // Closing the dialog (Escape, Cancel) also re-enables the form; a dismissed Razorpay window does the same via ondismiss.
  useEffect(() => {
    const d = ref.current;
    const onClose = () => { if (!handedOff.current) setBusy(false); };
    d?.addEventListener("close", onClose);
    return () => d?.removeEventListener("close", onClose);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await postJson("/api/checkout", { email: form.email, name: form.name || undefined, accepted_terms: form.accepted, turnstile_token: token || undefined });
      if (!res.ok) {
        fresh();
        setError(res.data.error || "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      const c = res.data;
      await loadRazorpay();
      const go = () => { handedOff.current = false; navigate(`/success?order=${encodeURIComponent(c.order_id)}&t=${encodeURIComponent(c.token)}`); };
      const rzp = new (window as any).Razorpay({
        key: c.key_id, order_id: c.razorpay_order_id, amount: c.amount, currency: c.currency,
        name: "Capturita", description: c.name, prefill: c.prefill, theme: { color: "#ad4e2c" },
        modal: { ondismiss: () => { handedOff.current = false; setBusy(false); ref.current?.showModal(); } },
        handler: async (r: Record<string, string>) => {
          // If verify fails (network), the webhook still issues the key and the success page keeps polling.
          await postJson("/api/payments/verify", r).catch(() => null);
          go();
        },
      });
      rzp.on("payment.failed", () => { setError("The payment did not go through. You have not been charged; please try again."); setBusy(false); });
      handedOff.current = true;
      close();
      rzp.open();
    } catch (err) {
      fresh();
      setError(err instanceof Error && err.name !== "AbortError" ? err.message : "The request timed out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <BuyContext.Provider value={open}>
      {children}
      <dialog ref={ref} aria-labelledby="buy-h" className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-background p-6 text-foreground shadow-lift backdrop:bg-black/50">
        <h2 id="buy-h" className="text-2xl font-semibold tracking-tight">Buy Capturita Pro</h2>
        <p className="mt-1 text-sm text-muted-foreground"><span className="text-xl font-medium text-foreground">₹999</span> one-time, a year of updates. Your license key is shown right after payment. Save it then.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Email
            <input type="email" required autoComplete="email" autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} />
          </label>
          <label className="block text-sm font-medium">Name <span className="font-normal text-muted-foreground">(optional)</span>
            <input type="text" autoComplete="name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required checked={form.accepted} onChange={(e) => setForm({ ...form, accepted: e.target.checked })} className="mt-1 size-4" />
            <span>I accept the <a href="/terms" target="_blank" rel="noopener" className="text-primary underline">Terms</a> and <a href="/refunds" target="_blank" rel="noopener" className="text-primary underline">Refund policy</a>.</span>
          </label>
          <div ref={box} />
          <p role="alert" className="min-h-5 text-sm text-destructive">
            {error}{error.includes("support") && <> <Link to="/support" onClick={close} className="underline">Contact support</Link></>}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={busy || (!!siteKey && !token)} className={`${btnPrimary} disabled:opacity-60`}>{busy ? "Opening payment…" : siteKey && !token ? "Checking…" : "Pay ₹999"}</button>
          </div>
        </form>
      </dialog>
    </BuyContext.Provider>
  );
}
