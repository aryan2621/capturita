import { useEffect } from "react";
import { usePath } from "../router";

/** Fades `[data-reveal]` blocks in as they scroll into view; re-scans on every route change. */
export function useReveal() {
  const path = usePath();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [path]);
}
