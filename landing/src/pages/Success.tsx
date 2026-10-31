import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Link } from "../router";
import { SUPPORT_EMAIL } from "../config";
import { type Receipt, receiptUrl } from "../receipt";
import { DownloadButton, Page, btnSecondary, prose } from "../components/ui";

const POLL_MS = 2000;
const MAX_MS = 90_000;

type State = { s: "waiting" } | { s: "ready"; key: string; receipt: Receipt | null } | { s: "timeout" } | { s: "refunded" } | { s: "invalid" };

export default function Success() {
  const q = new URLSearchParams(location.search);
  const order = q.get("order") ?? "";
  const token = q.get("t") ?? "";
  const [state, setState] = useState<State>(order && token ? { s: "waiting" } : { s: "invalid" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!order || !token) return;
    let stop = false;
    let timer: number;
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order)}?t=${encodeURIComponent(token)}`);
        if (stop) return;
        if (res.status === 404) return setState({ s: "invalid" });
        if (res.ok) {
          const d = await res.json();
          if (d.license_key) return setState({ s: "ready", key: d.license_key, receipt: d.receipt });
          if (d.status === "refunded") return setState({ s: "refunded" });
        }
      } catch { /* network blip: keep trying until the deadline */ }
      if (stop) return;
      if (Date.now() - started > MAX_MS) return setState({ s: "timeout" });
      timer = window.setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [order, token]);

  const copy = async (key: string) => {
    try { await navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* user can select the text */ }
  };

  return (
    <Page narrow title="Thank you" intro="Capturita Pro: your license key.">
      <div className={prose}>
        {state.s === "waiting" && <p role="status">Confirming your payment…</p>}
        {state.s === "invalid" && <p>This link is not valid. If you paid, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>}
        {state.s === "refunded" && <p>This purchase was refunded and its key is no longer active. Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>}
        {state.s === "timeout" && (
          <p role="status">Your payment was received, but your key is taking longer than usual. Reload this page in a minute, or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        )}
        {state.s === "ready" && (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="muted flex items-center gap-2 text-sm"><Check size={16} className="text-primary" aria-hidden /> Payment received</p>
              <p aria-label="License key" className="mt-2 break-all font-mono text-sm select-all">{state.key}</p>
              <button type="button" onClick={() => copy(state.key)} className={`${btnSecondary} mt-3`}><Copy size={16} aria-hidden />{copied ? "Copied" : "Copy key"}</button>
              <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(state.key + "\n")}`} download="capturita-license-key.txt" className={`${btnSecondary} ml-2 mt-3`}>Download key</a>
              {state.receipt && <a href={receiptUrl(state.receipt)} download="capturita-receipt.pdf" className={`${btnSecondary} ml-2 mt-3`}>Download receipt</a>}
              <p role="status" className="sr-only">{copied ? "Key copied" : ""}</p>
            </div>
            <p>Save this key now: copy it or download it below. Keep it safe: it is your proof of purchase.</p>
            <h2>Activate it</h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Download and open Capturita.</li>
              <li>Go to Settings → License.</li>
              <li>Paste the key and save.</li>
            </ol>
            <div className="pt-2"><DownloadButton /></div>
          </>
        )}
      </div>
    </Page>
  );
}
