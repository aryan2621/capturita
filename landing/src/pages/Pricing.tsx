import { Check, Minus } from "lucide-react";
import { Link } from "../router";
import { SUPPORT_EMAIL } from "../config";
import { Faq, PageHero, btnPrimary, h2 } from "../components/ui";
import { BuyButton } from "../components/Buy";

export const free = ["Screen and window recording with mic, system audio and camera", "Trim, split, cut, change speed and add cursor zooms", "Standard MP4 and GIF exports", "Recordings stay on your Mac"];
export const pro = ["On-device captions and subtitle exports", "AI-assisted edits with review before applying", "Studio scenes, animated titles and product showcases", "One year of updates for official Capturita builds"];

const compare: [string, boolean, boolean][] = [
  ["Screen, window and area recording", true, true],
  ["Mic, system audio and camera", true, true],
  ["Trim, split, cut and speed changes", true, true],
  ["Cursor zoom and click effects", true, true],
  ["MP4 and GIF export", true, true],
  ["On-device captions and subtitle exports", false, true],
  ["AI-assisted edits (review before applying)", false, true],
  ["Studio scenes and animated titles", false, true],
  ["Updates for official builds", false, true],
];

const faq = [
  ["What does one-time mean?", "You pay once. The key includes one year of updates for official Capturita builds. The version you bought remains usable after that; newer builds require a renewed key to unlock Pro."],
  ["Who handles payment?", "Payment is handled by Razorpay in INR. Card and UPI details go to Razorpay and never touch Capturita. Your license key is shown after payment; save it then."],
  ["How is my key checked?", "The signature is checked on your Mac. Official builds also activate the key online, which records your Mac (a hashed device ID and its name) and checks whether the key has been refunded. If the service is unreachable, the app allows up to 30 days since its last successful check for offline use."],
  ["Can I get a refund?", "Yes, within 14 days of purchase. Email your purchase email and order ID; see the refund page."],
  ["Can I use it on more than one computer?", "Yes, up to 2 Macs per key. To move it, choose Remove in Settings → License on the old Mac, or email support. Do not share or resell it."],
];

function Plan({ name, tagline, price, unit, list, lead, cta }: { name: string; tagline: string; price: string; unit?: string; list: string[]; lead?: string; cta: React.ReactNode }) {
  return (
    <article data-reveal className="lift flex flex-col rounded-2xl border border-border p-7">
      <h2 className="text-3xl font-semibold tracking-[-0.03em]">{name}</h2>
      <p className="mt-2 text-lg text-muted-foreground">{tagline}</p>
      <p className="mb-6 mt-10 text-5xl font-semibold tracking-[-0.04em]">{price}{unit && <span className="ml-2 text-base font-normal tracking-normal text-muted-foreground">{unit}</span>}</p>
      {cta}
      <ul className="mt-8 space-y-3 border-t border-border pt-6">
        {lead && <li className="font-medium">{lead}</li>}
        {list.map((x) => <li key={x} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0" aria-hidden />{x}</li>)}
      </ul>
    </article>
  );
}

export default function Pricing() {
  return (
    <>
      <PageHero title="Pricing"><p>Record and edit for free. Upgrade once for captions, AI editing and Studio.</p></PageHero>
      <section className="mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <Plan name="Free" tagline="Record and edit" price="₹0" list={free} cta={<Link to="/download" className={`${btnPrimary} w-full`}>Download free</Link>} />
          <Plan name="Pro" tagline="Captions, AI and Studio" price="₹999" unit="one-time" lead="Everything in Free and:" list={pro} cta={<BuyButton className={`${btnPrimary} w-full`} />} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Payment is by Razorpay (INR); the key is shown after payment and activated online on up to 2 Macs. See <Link to="/terms" className="underline">Terms</Link>.
        </p>
      </section>

      <section aria-labelledby="cmp-h" className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        <h2 id="cmp-h" className={h2}>Compare features</h2>
        <table className="mt-8 w-full text-left">
          <thead><tr className="border-b border-border text-sm text-muted-foreground"><th className="py-3 font-normal"><span className="sr-only">Feature</span></th><th className="w-24 py-3 text-center font-medium text-foreground">Free</th><th className="w-24 py-3 text-center font-medium text-foreground">Pro</th></tr></thead>
          <tbody>
            {compare.map(([label, f, p]) => (
              <tr key={label} className="border-b border-border">
                <td className="py-4 pr-4">{label}</td>
                {[f, p].map((on, i) => <td key={i} className="py-4 text-center">{on ? <Check size={18} className="mx-auto" aria-label="Included" /> : <Minus size={18} className="mx-auto text-muted-foreground" aria-label="Not included" />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="faq-h" className="mx-auto w-full max-w-4xl px-5 py-12 pb-24 sm:px-8">
        <h2 id="faq-h" className={`mb-6 ${h2}`}>Questions</h2>
        <Faq items={faq} />
        <p className="mt-6 text-sm text-muted-foreground">More questions? <Link to="/support" className="underline">Support</Link> · <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </section>
    </>
  );
}
