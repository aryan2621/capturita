import { useEffect, useRef, type ReactNode } from "react";
import { Download } from "lucide-react";
import { detectOS, RELEASES, useInstaller } from "../useInstaller";

export const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";
/** One type scale for every page: display titles, section titles, lead paragraphs. */
export const h1 = "text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-6xl";
export const h2 = "text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl";
export const lead = "text-lg leading-relaxed text-muted-foreground";

export const btnPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground! no-underline! transition-colors hover:opacity-85";
export const btnSecondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-background px-6 text-[15px] font-medium text-foreground! no-underline! transition-colors hover:bg-foreground/5";

export function Page({ title, intro, children, narrow }: { title: string; intro?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`${wrap} ${narrow ? "max-w-2xl" : ""} py-12 sm:py-16`}>
      <h1 className={h1}>{title}</h1>
      {intro && <p className={`mt-4 ${lead}`}>{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

/** Policy page: centred hero, then titled rows (title left, text right). */
/** OpenAI-style policy page: one narrow centred column and a big title; sections are numbered only when asked (their privacy policy numbers them, their terms don't). */
/** Monochrome brand mark: a camera shutter with a record dot. Inherits the text colour, so it follows light/dark. */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="32" r="28" />
        <path d="M32.0 21.5L56.2 35.5 M41.1 26.8L41.1 54.8 M41.1 37.2L16.8 51.2 M32.0 42.5L7.8 28.5 M22.9 37.2L22.9 9.2 M22.9 26.8L47.2 12.8" />
      </g>
      <circle cx="32" cy="32" r="4.2" fill="currentColor" />
    </svg>
  );
}

export function LegalPage({ title, intro, updated, numbered, children }: { title: string; intro: ReactNode; updated?: string; numbered?: boolean; children: ReactNode }) {
  return (
    <article className={`${numbered ? "legal-numbered " : ""}mx-auto w-full max-w-[42.25rem] px-5 pb-28 pt-16 sm:px-0 sm:pt-24`}>
      <header data-reveal className="text-center">
        {updated && <p className="text-sm">Updated: {updated}</p>}
        <h1 className="mt-8 text-5xl font-medium leading-none tracking-[-0.03em] sm:text-[4rem]">{title}</h1>
      </header>
      <div className="mt-14 space-y-6 text-[17px] leading-7">
        <p>{intro}</p>
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-reveal className="space-y-4 pt-12">
      <h2 className="text-3xl font-medium leading-[1.32]">{title}</h2>
      <div className="space-y-4 [&_a]:underline [&_a]:underline-offset-4 [&_li]:my-2 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-7 [&_ol]:list-decimal [&_ol]:pl-7 [&_.muted]:text-muted-foreground">{children}</div>
    </section>
  );
}

/** Long-form text styling for legal pages. */
export const prose = "space-y-3 leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_li]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_.muted]:text-muted-foreground";

export function DownloadButton() {
  const o = detectOS();
  const installer = useInstaller(o);
  const label = o === "mac" ? "Download for macOS" : "View macOS download";
  return (
    <a href={installer ?? RELEASES} className={btnPrimary}>
      <Download size={18} aria-hidden /> {label}
    </a>
  );
}

export function Faq({ items }: { items: string[][] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map(([q, a]) => (
        <details key={q} className="group p-4">
          <summary className="flex min-h-6 cursor-pointer items-center justify-between gap-4 font-medium">{q}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0 transition-transform motion-reduce:transition-none"><path d="m6 9 6 6 6-6" /></svg></summary>
          <p className="mt-2 text-muted-foreground">{a}</p>
        </details>
      ))}
    </div>
  );
}

const WORDS = ["Send the report by Friday.", "Sounds good, see you at 3.", "Remind me to call Mum.", "Can we move the standup to 10:30?", "Thanks, that works for me.", "Book a table for four on Saturday.", "Let's sync after lunch."];
const CLAY = [217, 119, 87], SAND = [233, 180, 140];

/** Voice flowing into the app: layered clay-to-sand ribbons swell with speech and end in a mic orb that sends out rings. */
export function PageHero({ title, children, icon }: { title: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <section className="px-5 pb-10 pt-14 text-center sm:px-8 sm:pt-20">
      {icon && <div className="mx-auto mb-8 grid size-16 place-items-center rounded-2xl border border-border bg-card shadow-sm">{icon}</div>}
      <h1 data-reveal className={`mx-auto max-w-4xl ${h1}`}>{title}</h1>
      {children && <div data-reveal style={{ ["--rd" as string]: "120ms" }} className={`mx-auto mt-6 max-w-2xl ${lead}`}>{children}</div>}
    </section>
  );
}

export const btnLink = "inline-flex min-h-11 items-center gap-1.5 px-4 text-[15px] font-medium text-foreground hover:underline";
