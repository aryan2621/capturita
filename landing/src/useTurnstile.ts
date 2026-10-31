import { useEffect, useRef, useState } from "react";
import { loadTurnstile } from "./api";

/** Turnstile is on only when the worker has a site key; the widget stays invisible unless it needs a click. Put `box` on an empty div. */
export function useTurnstile(onError: (message: string) => void) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/config/public").then((r) => r.json()).then((c) => setSiteKey(c.turnstile_site_key ?? null)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!siteKey || !box.current) return;
    let gone = false;
    loadTurnstile().then(() => {
      if (gone || !box.current) return;
      widget.current = (window as any).turnstile.render(box.current, {
        sitekey: siteKey, appearance: "interaction-only",
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => { setToken(""); onError("The bot check could not run. Reload the page and try again, or contact support."); },
      });
    }).catch((err) => onError(err.message));
    return () => { gone = true; if (widget.current) (window as any).turnstile?.remove(widget.current); widget.current = undefined; };
  }, [siteKey]);
  // A Turnstile token works once, so every failed attempt needs a fresh one.
  const fresh = () => { setToken(""); if (widget.current) (window as any).turnstile?.reset(widget.current); };
  return { siteKey, token, box, fresh };
}
