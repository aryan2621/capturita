import { Link } from "../router";
import { SUPPORT_EMAIL } from "../config";
import { LegalPage, LegalSection } from "../components/ui";

export default function Privacy() {
  return (
    <LegalPage title="Privacy" intro="What Capturita does with your recordings and data." updated="October 2026" numbered>
      <LegalSection title="What stays on your Mac">
        <ul>
          <li><strong>Recordings and edits.</strong> Capturita stores them in your local Movies/Capturita folder. Recordings are not uploaded unless you choose a sharing destination.</li>
          <li><strong>Captions and AI editing.</strong> Speech recognition and the default AI editor run on your Mac. If you choose a cloud AI provider in Settings, the text and context needed for that request are sent to that provider using your own key.</li>
          <li><strong>Google uploads.</strong> YouTube or Drive uploads occur only when you connect your own Google account and start an upload.</li>
          <li><strong>Pro status.</strong> Official builds send your license key, a one-way hash of your Mac’s hardware ID and your Mac’s name (for example “Rishabh’s MacBook”) to the license service when activating and about daily afterwards. This limits a key to 2 Macs and lets us disable refunded keys; the hash cannot be reversed into the hardware ID. No recording, caption, or AI prompt is sent for this check.</li>
          <li><strong>No account or app telemetry.</strong> Capturita does not require an account or include analytics tracking.</li>
        </ul>
      </LegalSection>

      <LegalSection title="When Capturita connects to the internet">
        <ul>
          <li><strong>Model downloads.</strong> Optional AI and caption models are downloaded from their model hosts when you choose to use them.</li>
          <li><strong>Cloud AI.</strong> If enabled, the chosen provider receives the text you ask it to process. Its privacy policy applies to that request.</li>
          <li><strong>Sharing.</strong> Uploads go to the destination you choose, such as YouTube or Google Drive.</li>
        </ul>
      </LegalSection>

      <LegalSection title="This website">
        <p>The site does not use advertising analytics. Cloudflare hosts the site and processes checkout requests; when configured, Cloudflare Turnstile helps prevent automated checkout abuse.</p>
      </LegalSection>

      <LegalSection title="Purchases">
        <p>For a Capturita Pro purchase, the site stores your email address, optional name, payment and order IDs, amount, dates, license key, and the Macs it is activated on (hashed device ID, device name, last-seen time) to deliver your purchase, provide support, process refunds, and enforce the 2-Mac limit. Payment details are handled by Razorpay and are not stored by Capturita.</p>
        <p>Purchase data is not sold or used for marketing. To ask about or request deletion of purchase data where legally permitted, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also <Link to="/terms">Terms</Link> and <Link to="/refunds">Refunds</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
