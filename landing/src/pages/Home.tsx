import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Captions, FileVideo, Mic, Rocket, X } from "lucide-react";
import { Link } from "../router";
import { DownloadButton, btnPrimary, btnSecondary, h2, lead, wrap } from "../components/ui";
import { features } from "../features";

const stickyTop = 64; // matches the 4rem nav
const settleEnd = 0.18; // share of the scroll track spent moving the window into place
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const modes = [
  { word: "code", tint: "#7c5cff", grad: "linear-gradient(90deg,#CEB0FB,#10A0E8,#04B84C,#FCD448)" },
  { word: "launches", tint: "#f2561d", grad: "linear-gradient(90deg,#FC6C28,#FCD448,#FCC0CC,#CEB0FB)" },
  { word: "lessons", tint: "#0e8fd0", grad: "linear-gradient(90deg,#10A0E8,#FCD448,#FC6C28,#FCC0CC)" },
];

/** The hero line: each highlighted word is a button that previews its own set of decorations. */
function Headline({ mode, setMode, setPaused }: { mode: number; setMode: (i: number) => void; setPaused: (p: boolean) => void }) {
  return (
    <h1 id="home-title" data-reveal onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="mx-auto max-w-5xl text-5xl font-semibold leading-[1.04] tracking-[-0.06em] sm:text-7xl lg:text-[5.5rem]">
      Now you can record{" "}
      {modes.map((m, i) => (
        <Fragment key={m.word}>
          {i > 0 && (i === modes.length - 1 ? " & " : ", ")}
          <button type="button" aria-pressed={mode === i} onMouseEnter={() => setMode(i)} onFocus={() => setMode(i)} onClick={() => setMode(i)} className="relative inline cursor-pointer whitespace-nowrap rounded-sm font-[inherit] tracking-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-4">
            <span aria-hidden>{[...m.word].map((c, j) => <span key={j} className="transition-colors duration-300" style={{ color: mode === i ? m.tint : undefined, transitionDelay: `${j * 45}ms` }}>{c}</span>)}</span>
            <span className="sr-only">{m.word}</span>
            <span aria-hidden className="pointer-events-none absolute inset-x-[.01em] -bottom-[.075em] h-[.035em] origin-left rounded-full transition-transform duration-500" style={{ background: m.grad, transform: mode === i ? "none" : "scaleX(0)" }} />
          </button>
        </Fragment>
      ))}{" "}
      all in one place.
    </h1>
  );
}

/** Floating art around the hero window (ChatGPT's set: asterisks, a tilted label, one outline icon, a tilted text card); one per headline word. */
function HeroDecor({ mode }: { mode: number }) {
  const item = "absolute text-foreground [animation:float_7s_ease-in-out_infinite]";
  const sparkle = (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" aria-hidden className="size-full">
      <path d="M32 6v52M9.5 19l45 26M9.5 45l45-26" />
    </svg>
  );
  const tag = "rounded-2xl border border-border bg-muted px-8 py-6 text-2xl font-semibold shadow-lg";
  const ring = "grid size-36 place-items-center rounded-full border-[6px] border-foreground";
  const scene = (label: string, title: string, icon: ReactNode, lines: string[]) => (
    <>
      <div className={`${item} left-[1.5%] top-[2%] size-14`}>{sparkle}</div>
      <div className={`${item} bottom-[8%] right-[2%] size-14 [animation-delay:-3s]`}>{sparkle}</div>
      <div className={`${item} left-[3%] top-[22%] -rotate-[17deg] ${tag} [animation-delay:-1s]`}><span className="block text-sm font-medium text-muted-foreground">{label}</span>{title}</div>
      <div className={`${item} left-[4%] top-[48%] ${ring} [animation-delay:-4s]`}>{icon}</div>
      <div className={`${item} right-[3%] top-[8%] w-64 rotate-[6deg] rounded-xl border border-border bg-card p-4 text-left font-mono text-[11px] leading-5 text-muted-foreground shadow-lg [animation-delay:-2s]`}>
        <Captions size={18} className="mb-2 text-foreground" />
        {lines.map((l) => <span key={l} className="block">{l}</span>)}
      </div>
    </>
  );
  const scenes: ReactNode[] = [
    scene("Code", "Record the walkthrough", <span className="font-mono text-5xl font-semibold">{"{ }"}</span>, ["Record a window or area", "Zoom to the cursor", "Export MP4 or GIF"]),
    scene("Launch", "Polish the demo", <Rocket size={60} strokeWidth={1.8} aria-hidden />, ["Trim and cut", "Add a background", "Export MP4 or GIF"]),
    scene("Lesson", "Add captions", <Mic size={60} strokeWidth={1.8} aria-hidden />, ["Record with your mic", "Captions made on your Mac", "Export MP4 or GIF"]),
  ];
  return (
    <div aria-hidden className="feature-decor pointer-events-none absolute inset-0 hidden lg:block">
      {scenes.map((s, i) => <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${mode === i ? "opacity-100" : "opacity-0"}`}>{s}</div>)}
    </div>
  );
}

function FeatureShowcase({ mode }: { mode: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeFeature = features[activeIndex];

  const selectFeature = (index: number) => {
    const nextIndex = (index + features.length) % features.length;
    setActiveIndex(nextIndex);
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    const scrollRange = track.offsetHeight - stage.offsetHeight;
    const trackTop = window.scrollY + track.getBoundingClientRect().top;
    const target = trackTop - stickyTop + scrollRange * (settleEnd + ((nextIndex + 0.5) / features.length) * (1 - settleEnd));
    window.scrollTo({ top: target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage || !window.matchMedia("(min-width: 1024px)").matches) return;
      const scrollRange = track.offsetHeight - stage.offsetHeight;
      if (scrollRange <= 0) return;

      const progress = clamp01((stickyTop - track.getBoundingClientRect().top) / scrollRange);
      const settle = ease(clamp01(progress / settleEnd));
      const vw = document.documentElement.clientWidth;
      const listX = Math.max(32, vw * 0.08);
      const maxW = stage.offsetHeight * 1.5 * 0.9; // keep the 3:2 window inside the stage
      // final window flush with the right edge, always leaving a 20rem list plus a 3rem gap on its left
      // settled window sits right next to the 20rem list (64px gap) and stays fully on screen
      const endX = listX + 20 * 16 + 64;
      const endW = Math.min(vw - endX - 48, stage.offsetHeight * 0.74 * 1.5);
      const startW = Math.min(vw * 0.685, 1040, maxW);
      const startX = (vw - startW) / 2;
      stage.style.setProperty("--fw", `${endW}px`);
      stage.style.setProperty("--fl", `${listX}px`);
      stage.style.setProperty("--lw", `${20 * 16}px`);
      stage.style.setProperty("--fx", `${startX + (endX - startX) * settle}px`);
      stage.style.setProperty("--fs", `${startW / endW + (1 - startW / endW) * settle}`);
      stage.style.setProperty("--fp", `${settle}`);

      const featureProgress = clamp01((progress - settleEnd) / (1 - settleEnd));
      const next = Math.min(features.length - 1, Math.floor(Math.min(featureProgress, 0.9999) * features.length));
      setActiveIndex((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => { frame ||= requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="features" aria-label="Features" className="overflow-x-clip">
      <div ref={trackRef} className="relative lg:h-[520svh]">
        <div ref={stageRef} className="feature-story-stage relative px-5 py-10 sm:px-8 lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)] lg:p-0">
          <HeroDecor mode={mode} />
          <div
            role="group"
            aria-label="Select a feature"
            className="feature-story-copy mx-auto max-w-6xl divide-y divide-border border-y border-border lg:absolute lg:left-[var(--fl,2rem)] lg:top-1/2 lg:z-20 lg:mx-0 lg:w-[var(--lw,20rem)] lg:-translate-y-1/2"
          >
            {features.map((feature, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={feature.eyebrow}
                  type="button"
                  aria-pressed={isActive}
                  aria-controls="feature-preview"
                  onClick={() => selectFeature(index)}
                  className={`block w-full py-4 text-left transition-colors sm:py-5 ${isActive ? "text-foreground" : "text-foreground/80 hover:text-foreground"}`}
                >
                  <span className={`feature-story-label block ${isActive ? "feature-story-label-active" : ""}`}>{feature.eyebrow}</span>
                  <span className={`feature-story-detail ${isActive ? "feature-story-detail-active" : ""}`}>
                    <span className="block text-base font-semibold text-foreground">{feature.title}</span>
                    <span className="mt-4 block text-base leading-relaxed text-muted-foreground">{feature.text}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="feature-story-image relative z-10 mt-8 overflow-hidden rounded-2xl border border-border bg-muted shadow-[0_20px_60px_-12px_rgba(0,0,0,.25)] lg:absolute lg:left-0 lg:top-1/2 lg:mt-0">
            <div id="feature-preview" role="group" aria-label={`${activeFeature.eyebrow} feature preview`} className="relative aspect-[1.5] w-full">
              {features.map((feature, index) => (
                <img
                  key={feature.image}
                  src={feature.image}
                  alt={index === activeIndex ? feature.imageAlt : ""}
                  aria-hidden={index !== activeIndex}
                  loading="eager"
                  className={`feature-preview-image absolute inset-0 block h-full w-full object-cover object-left-top ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between lg:hidden">
            <p className="text-sm text-muted-foreground" aria-live="polite">{String(activeIndex + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}</p>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous feature" onClick={() => selectFeature(activeIndex - 1)} className="inline-flex size-10 items-center justify-center rounded-full border border-border hover:bg-muted"><ArrowLeft size={18} aria-hidden /></button>
              <button type="button" aria-label="Next feature" onClick={() => selectFeature(activeIndex + 1)} className="inline-flex size-10 items-center justify-center rounded-full border border-border hover:bg-muted"><ArrowRight size={18} aria-hidden /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const pane = "absolute bottom-0 right-0 overflow-hidden rounded-tl-2xl bg-background shadow-[0_-8px_40px_-12px_rgba(0,0,0,.2)]";
const cases: { title: string; text: string; art: ReactNode }[] = [
  { title: "Product demos", text: "Record a walkthrough, add springy click zooms and a clean title, then export it ready to share.",
    art: <div className={`${pane} left-[14%] top-[48%] p-4`}><p className="text-xs text-muted-foreground">Timeline</p><div className="relative mt-3 space-y-2"><div className="h-7 w-[90%] rounded-md bg-[#cfe6c4]" /><div className="ml-[22%] h-7 w-[40%] rounded-md bg-[#bcd3f5]" /></div><span className="mt-4 inline-block rounded-full border border-border px-3 py-1 text-xs">Zoom 1.6×</span></div> },
  { title: "Tutorials", text: "Turn speech into captions on your Mac so every step is easy to follow, with nothing uploaded.",
    art: <div className={`${pane} left-[10%] top-[50%] p-5`}><p className="text-sm font-semibold">Captions</p><ul className="mt-3 space-y-2 font-mono text-xs text-muted-foreground"><li>00:03 Open Settings</li><li>00:07 Choose Captions</li><li className="text-foreground">00:11 Pick a model</li></ul><span className="absolute right-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs text-background">On this Mac</span></div> },
  { title: "Bug reports", text: "Show exactly what happened. Trim the dead time, circle the problem and send a short clip.",
    art: <div className="absolute bottom-10 left-6 right-6"><div className="relative flex items-center gap-3 rounded-2xl bg-background p-3 pr-6 shadow-lg"><span className="grid size-12 place-items-center rounded-xl bg-[#2f6bff] text-white"><FileVideo size={24} aria-hidden /></span><span><span className="block text-base font-semibold">checkout-bug.mp4</span><span className="text-sm text-muted-foreground">Video · 0:24</span></span><span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-foreground text-background"><X size={14} aria-hidden /></span></div></div> },
  { title: "Release notes", text: "Export a tight GIF or MP4 of what changed and drop it straight into your changelog.",
    art: <div className={`${pane} left-[12%] top-[52%] p-5`}><p className="text-sm font-semibold">Export</p><div className="mt-3 flex gap-2 text-xs"><span className="rounded-full bg-foreground px-3 py-1 text-background">GIF</span><span className="rounded-full border border-border px-3 py-1">MP4</span></div><span className="mt-5 block rounded-full bg-foreground py-2 text-center text-xs text-background">Export</span></div> },
];

function UseCases() {
  const rail = useRef<HTMLDivElement>(null);
  const go = (dir: number) => rail.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  return (
    <section aria-labelledby="uses-h" className="py-20 sm:py-28">
      <div className={`${wrap} text-center`} data-reveal>
        <h2 id="uses-h" className={`mx-auto max-w-3xl ${h2}`}>Use Capturita for demos, docs, and everything in between.</h2>
        <div className="mt-8 flex justify-center gap-4">
          <button type="button" aria-label="Previous" onClick={() => go(-1)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"><ArrowLeft size={18} aria-hidden /></button>
          <button type="button" aria-label="Next" onClick={() => go(1)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"><ArrowRight size={18} aria-hidden /></button>
        </div>
      </div>
      <div className="mx-auto mt-10 w-full max-w-[67.25rem] px-5 sm:px-0" data-reveal>
      <div ref={rail} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain">
        {cases.map((c) => (
          <article key={c.title} className="lift relative h-[36rem] w-[min(23.125rem,82vw)] shrink-0 snap-start overflow-hidden rounded-md bg-muted p-8">
            <h3 className="text-2xl font-medium tracking-[-0.02em]">{c.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed">{c.text}</p>
            {c.art}
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}

function Safety() {
  return (
    <section aria-labelledby="safe-h" className="py-20 text-center sm:py-28">
      <div className={wrap} data-reveal>
        <h2 id="safe-h" className={h2}>Designed to keep your recordings yours</h2>
        <p className={`mx-auto mt-4 max-w-2xl ${lead}`}>Capturita is built around your privacy: recordings, captions and AI editing stay on your Mac unless you choose to share them.</p>
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 text-left md:grid-cols-2">
          {[["On-device by default", "Captions and AI editing run on your Mac. Cloud AI and Google uploads are opt-in.", "/privacy", "Privacy"], ["Pay once, keep it", "Pro is a one-time purchase with a 14-day refund window and a year of updates.", "/pricing", "Pricing"]].map(([t, d, to, cta]) => (
            <article key={t} className="lift rounded-2xl border border-border p-6">
              <h3 className="text-xl font-medium">{t}</h3>
              <p className="mt-3 text-muted-foreground">{d}</p>
              <Link to={to} className={`${btnPrimary} mt-6 !min-h-10 !px-5 !text-sm`}>Learn more</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [mode, setMode] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setMode((m) => (m + 1) % modes.length), 4500);
    return () => clearInterval(t);
  }, [paused]);
  return (
    <>
      <section aria-labelledby="home-title" className="relative pb-10 pt-12 sm:pt-20">
        <div className={`${wrap} relative text-center`}>
          <Headline mode={mode} setMode={setMode} setPaused={setPaused} />
          <div data-reveal style={{ ["--rd" as string]: "150ms" }} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <DownloadButton />
            <Link to="/features" className="inline-flex min-h-11 items-center gap-1.5 px-4 text-[15px] font-medium text-foreground hover:underline">See what it does <ArrowRight size={16} aria-hidden /></Link>
          </div>
        </div>
      </section>

      <FeatureShowcase mode={mode} />

      <UseCases />
      <Safety />

      <section aria-labelledby="try-h" className="py-24 text-center sm:py-32">
        <div data-reveal className={wrap}>
          <h2 id="try-h" className={h2}>Try Capturita today</h2>
          <p className={`mx-auto mt-4 max-w-xl ${lead}`}>Free to download for macOS. Upgrade once for captions, AI editing and Studio.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <DownloadButton />
            <Link to="/pricing" className={btnSecondary}>See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
