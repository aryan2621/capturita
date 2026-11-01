import { useEffect, useState } from "react";
import { STOREFRONT_URL } from "./config";

type Product = { price_paise: number; max_devices: number; refund_window_days: number; updates_months: number };

// One request shared by every component; null if the storefront can't be reached.
let request: Promise<Product | null> | undefined;
const load = () =>
  (request ??= fetch(`${STOREFRONT_URL}/api/products/capturita`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => d.product as Product)
    .catch(() => null));

const updatesText = (months: number) => (months % 12 === 0 ? (months === 12 ? "one year" : `${months / 12} years`) : `${months} months`);

/** Price, seats, refund window and update period, all read from the storefront so Admin → Products is the only place to change them. Wording falls back to no numbers until loaded. */
export function useProduct() {
  const [p, setP] = useState<Product | null>(null);
  useEffect(() => { load().then(setP); }, []);
  return {
    price: p ? `₹${(p.price_paise / 100).toLocaleString("en-IN")}` : "—",
    upTo: p ? `up to ${p.max_devices} Mac${p.max_devices === 1 ? "" : "s"}` : "a limited number of Macs",
    refundDays: p ? `${p.refund_window_days} days` : "the refund window",
    refundWindow: p ? `${p.refund_window_days}-day refund window` : "refund window",
    updates: p ? `${updatesText(p.updates_months)} of updates` : "updates",
  };
}
