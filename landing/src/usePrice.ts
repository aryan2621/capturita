import { useEffect, useState } from "react";
import { STOREFRONT_URL } from "./config";

/** Live price from the storefront. Shows "—" until it loads (or if the call fails); nothing is hard-coded. */
export function usePrice(): string {
  const [price, setPrice] = useState("—");
  useEffect(() => {
    fetch(`${STOREFRONT_URL}/api/products/capturita`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPrice(`₹${(d.product.price_paise / 100).toLocaleString("en-IN")}`))
      .catch(() => {});
  }, []);
  return price;
}
