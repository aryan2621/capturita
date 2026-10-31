import { ArrowRight, Mic, Monitor, ShieldCheck, WandSparkles } from "lucide-react";
import { Link } from "../router";
import { DownloadButton, Logo, PageHero, btnLink, h2, lead, wrap } from "../components/ui";
import { features } from "../features";

const steps = [
  { icon: Monitor, title: "Choose what to record", text: "Pick a display, window or custom area. Add a microphone, system audio or camera if you need them." },
  { icon: Mic, title: "Record your walkthrough", text: "Start from the app or press ⌘⇧R. Capturita keeps the recording on your Mac." },
  { icon: WandSparkles, title: "Polish and share", text: "Edit the timeline, add captions or Studio scenes with Pro, then export an MP4 or GIF." },
];

export default function Features() {
  return (
    <>
      <PageHero icon={<Logo className="size-10" />} title="Everything you need for a clear demo">
        <p>Capturita records your screen, polishes it into a finished walkthrough, and keeps every file on your Mac.</p>
        <p className="mt-4 text-base text-muted-foreground">macOS 15 or later, Apple silicon. Core recording and editing are free.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <DownloadButton />
          <Link to="/pricing" className={btnLink}>See pricing <ArrowRight size={16} aria-hidden /></Link>
        </div>
      </PageHero>

      <section aria-label="Capturita in action" className="px-5 sm:px-8">
        <div data-reveal className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-muted shadow-[0_20px_60px_-12px_rgba(0,0,0,.2)]">
          <video autoPlay muted loop playsInline preload="metadata" poster="/hero-poster.jpg" aria-label="Capturita's editor: changing the background, adjusting the frame, and playing back a recording with zooms" className="block aspect-[1280/880] w-full">
            <source src="/hero.webm" type="video/webm" />
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      {features.map((f, i) => (
        <section key={f.eyebrow} aria-labelledby={`f-${i}`} className="py-14 sm:py-20">
          <div data-reveal className={`${wrap} grid items-center gap-10 lg:grid-cols-12 lg:gap-16`}>
            <div className={`lg:col-span-4 ${i % 2 ? "lg:order-2" : ""}`}>
              <p className="text-sm font-medium text-muted-foreground">{f.eyebrow}</p>
              <h2 id={`f-${i}`} className={`mt-3 ${h2} !text-3xl sm:!text-4xl`}>{f.title}</h2>
              <p className={`mt-4 ${lead}`}>{f.text}</p>
            </div>
            <div className={`lg:col-span-8 ${i % 2 ? "lg:order-1" : ""}`}>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted shadow-[0_20px_60px_-12px_rgba(0,0,0,.2)]">
                <img src={f.image} alt={f.imageAlt} loading={i ? "lazy" : "eager"} className="block aspect-[1.5] w-full object-cover object-left-top" />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="how-h" className="py-14 sm:py-20">
        <div className={wrap}>
          <h2 id="how-h" className={`max-w-2xl ${h2}`}>A clear demo in three steps</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} data-reveal style={{ ["--rd" as string]: `${i * 100}ms` }} className="lift rounded-2xl border border-border p-6">
                <s.icon size={22} className="text-muted-foreground" aria-hidden />
                <p className="mt-8 text-sm text-muted-foreground">0{i + 1}</p>
                <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="privacy-h" className="bg-forest py-16 sm:py-24">
        <div data-reveal className={`${wrap} grid items-center gap-10 md:grid-cols-2`}>
          <div>
            <ShieldCheck className="mb-4 text-muted-foreground" size={26} aria-hidden />
            <h2 id="privacy-h" className={h2}>Your recordings stay yours.</h2>
            <p className={`mt-4 ${lead}`}>Captions and AI editing run on your Mac. Recordings stay in your Capturita folder unless you choose to upload or share them. Cloud AI and Google uploads are opt-in.</p>
            <Link to="/privacy" className={`${btnLink} !px-0 underline`}>Read the privacy page <ArrowRight size={15} aria-hidden /></Link>
          </div>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-background px-5">
            {[["Recordings", "On this Mac"], ["Captions", "On this Mac"], ["AI edits", "On this Mac"], ["Sharing", "Only when you choose"]].map(([label, status]) => (
              <li key={label} className="flex items-center justify-between gap-4 py-4"><span>{label}</span><span className="text-muted-foreground">{status}</span></li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
