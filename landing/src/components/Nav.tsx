import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, usePath } from "../router";
import { Logo, btnPrimary, btnSecondary, wrap } from "./ui";
import { BuyButton } from "./Buy";

const links = [["/features", "Features"], ["/pricing", "Pricing"], ["/download", "Download"], ["/support", "Support"]];

export default function Nav() {
  const path = usePath();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const item = (to: string, label: string) => {
    const className = `flex min-h-9 items-center rounded-lg px-2.5 text-sm transition-colors hover:bg-foreground/[.06] hover:text-foreground aria-[current=page]:bg-foreground/[.06] aria-[current=page]:text-foreground ${path === to ? "" : "text-muted-foreground"}`;
    if (to.includes("#")) {
      return <a key={to} href={path === "/" ? to.slice(1) : to} className={className} onClick={() => setOpen(false)}>{label}</a>;
    }
    return (
      <Link key={to} to={to} aria-current={path === to ? "page" : undefined} className={className}>
      {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-[100rem] px-5 sm:px-8 min-h-16 items-center justify-between gap-2 py-2">
        <Link to="/" className="group flex min-h-11 items-center gap-2 font-semibold tracking-tight"><Logo className="size-7 transition-transform duration-500 ease-out group-hover:rotate-60" />Capturita</Link>
        <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">{links.map(([to, l]) => item(to, l))}</nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/download" className={`${btnSecondary} !min-h-10 !py-1.5 text-sm`}>Download</Link>
          <BuyButton className={`${btnPrimary} !min-h-10 !py-1.5 text-sm`} />
        </div>
        <button type="button" className="flex size-11 items-center justify-center rounded-lg hover:bg-foreground/[.06] md:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-background md:hidden">
          <nav aria-label="Mobile" className={`${wrap} flex flex-col gap-1 py-3`}>
            {links.map(([to, l]) => item(to, l))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/download" className={btnSecondary}>Download</Link>
              <BuyButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
