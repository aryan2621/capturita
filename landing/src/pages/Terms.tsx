import { Link } from "../router";
import { SUPPORT_EMAIL } from "../config";
import { LegalPage, LegalSection } from "../components/ui";

export default function Terms() {
  return (
    <LegalPage title="Terms" intro="Terms for the Capturita website and optional Pro purchase.">
      <LegalSection title="Pro purchase">
        <p>Capturita Pro is a one-time purchase of ₹999. It unlocks captions, AI-assisted editing, and the Studio motion-graphics workflow in eligible official builds, and includes one year of updates. Your purchased version remains usable after the update period; newer official builds require a renewed key to unlock Pro.</p>
        <p>A key is checked with a signature and activated online on each Mac. It works on up to 2 Macs, and you can free a seat from Settings → License → Remove or by emailing support. The app re-checks about daily; if the license service is unavailable, it allows up to 30 days since the last successful check for offline use. A key is for one person. Do not share or resell keys.</p>
      </LegalSection>

      <LegalSection title="Payment and refunds">
        <p>Payments are processed by Razorpay. The site does not receive or store card or UPI credentials. Refunds are available within 14 days; see the <Link to="/refunds">refund policy</Link>.</p>
      </LegalSection>

      <LegalSection title="Website use">
        <p>Do not use the website or checkout to interfere with the service, evade payment, or submit someone else’s personal information. The website and its content are provided as-is, subject to applicable law.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Questions about these terms or your purchase? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
