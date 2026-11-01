import { REFUNDS_URL, SUPPORT_EMAIL, TERMS_URL } from "../config";
import { LegalPage, LegalSection } from "../components/ui";

export default function Privacy() {
  return (
    <LegalPage title="Privacy" intro="What Capturita does with your recordings and data." updated="October 2026" numbered>
      <LegalSection title="What stays on your Mac">
        <ul>
          <li><strong>Recordings and edits.</strong> Capturita stores them in your local Movies/Capturita folder. Recordings are not uploaded unless you choose a sharing destination.</li>
          <li><strong>Captions and AI editing.</strong> Speech recognition and the default AI editor run on your Mac. If you choose a cloud AI provider in Settings, the text and context needed for that request are sent to that provider using your own key.</li>
          <li><strong>Google uploads.</strong> YouTube or Drive uploads occur only when you connect your own Google account and start an upload.</li>
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
        <p>The site does not use advertising analytics. Cloudflare hosts the site. Purchases are handled on the storefront, which has its own privacy policy.</p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also <a href={TERMS_URL}>Terms</a> and <a href={REFUNDS_URL}>Refunds</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
