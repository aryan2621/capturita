import { Link } from "../router";
import { DownloadButton, h1, lead, prose, wrap } from "../components/ui";

function Tile({ img, alt, flip, children }: { img: string; alt: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <div data-reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={`overflow-hidden rounded-2xl border border-border bg-muted shadow-[0_20px_60px_-12px_rgba(0,0,0,.2)] ${flip ? "md:order-2" : ""}`}>
        <img src={img} alt={alt} className="block aspect-[1.5] w-full object-cover object-left-top" />
      </div>
      <div className={flip ? "md:order-1" : ""}>{children}</div>
    </div>
  );
}

export default function Download() {
  return (
    <div className={`${wrap} max-w-5xl space-y-24 py-12 sm:py-20`}>
      <Tile img="/screenshots/editor-motion.jpg" alt="Capturita editor with zoom and cursor controls">
        <h1 className={h1}>Download Capturita for macOS</h1>
        <p className={`mt-6 ${lead}`}>Record your screen, polish it into a clear demo, and keep every file on your Mac. Free to download; unlock Pro with a one-time license.</p>
        <p className="mt-4 text-muted-foreground">macOS 15 or later, Apple silicon (M1 or newer). Capturita is macOS-only.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <DownloadButton />
        </div>
      </Tile>

      <Tile img="/screenshots/captions-settings.jpg" alt="Capturita settings" flip>
        <h2 className={h1}>Install and activate</h2>
        <div className={`${prose} mt-6 text-[15px] [&_h2]:text-xl`}>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Open the downloaded <code>.dmg</code> and drag <strong>Capturita</strong> into <strong>Applications</strong>.</li>
            <li>If macOS says <strong>“Apple could not verify Capturita is free of malware”</strong>, click <strong>Done</strong>, open <strong>System Settings → Privacy &amp; Security</strong> and choose <strong>Open Anyway</strong>.</li>
            <li>If macOS says Capturita <strong>“is damaged”</strong>, run this once in Terminal and open it again:
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-sm">xattr -dr com.apple.quarantine /Applications/Capturita.app</pre>
            </li>
            <li>On first launch, grant Screen Recording permission. Microphone and Camera are optional.</li>
          </ol>
          <p>After purchase, copy the license key from the thank-you page, then open <strong>Settings → License</strong> in Capturita, paste it and choose <strong>Activate</strong>. See <Link to="/pricing">pricing</Link> for the full feature split.</p>
          <p className="text-muted-foreground">A Pro purchase includes one year of updates for official builds; the version you bought stays usable after that.</p>
        </div>
      </Tile>
    </div>
  );
}
