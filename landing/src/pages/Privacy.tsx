import { REFUNDS_URL, STORE_PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "../config";
import { LegalPage, LegalSection } from "../components/ui";

export default function Privacy() {
  return (
    <LegalPage title="Privacy" intro="What Capturita does with your recordings and data." updated="November 2026" numbered>
      <LegalSection title="What stays on your Mac">
        <ul>
          <li><strong>Recordings and edits.</strong> Capturita stores them in your local Movies/Capturita folder. Recordings are not uploaded unless you choose a sharing destination.</li>
          <li><strong>Captions and AI editing.</strong> Speech recognition and the default AI editor run on your Mac. If you choose a cloud AI provider in Settings (Claude, OpenAI, Gemini or an OpenAI-compatible API), your transcript and click times, and for Studio drafts the text you provide and still images of the scenes, as needed for that request are sent to that provider using your own key.</li>
          <li><strong>Google uploads.</strong> YouTube or Drive uploads occur only when you connect your own Google account, through a Google Cloud project you create (<a href="https://github.com/aryan2621/capturita/blob/main/docs/google-setup.md">setup guide</a>), and start an upload.</li>
          <li><strong>No usage telemetry.</strong> Capturita includes no analytics tracking and the free app needs no account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="When Capturita connects to the internet">
        <ul>
          <li><strong>Model downloads.</strong> Caption models (75 MB to 1.6 GB, 547 MB by default) and local AI models (2.4 GB to 16.5 GB) are downloaded from Hugging Face when you choose to use them. The first Studio render also downloads a headless Chrome of about 100 MB.</li>
          <li><strong>Cloud AI.</strong> If enabled, the chosen provider receives your transcript and click times, and for Studio drafts the text you provide and still images of scenes. Its privacy policy applies to that request.</li>
          <li><strong>Pro licence check.</strong> Official builds with a Pro key send the key, a one-way hash of your Mac’s hardware ID and the Mac’s name to the licence service when you activate, at launch, when you return to the window and about every five minutes. This limits a key to its device count and lets refunded keys be disabled. If the service is unreachable, Pro keeps working offline for up to 30 days after the last successful check.</li>
          <li><strong>Studio extras.</strong> Suggested music is fetched from Wikimedia, and Studio can load logos and brand details from websites you enter.</li>
          <li><strong>Sharing.</strong> Uploads go to the destination you choose, such as YouTube or Google Drive.</li>
        </ul>
      </LegalSection>

      <LegalSection title="This website">
        <p>The site does not use advertising analytics. Cloudflare hosts the site. Purchases are handled on the storefront, which has its <a href={STORE_PRIVACY_URL}>own privacy policy</a>.</p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also <a href={TERMS_URL}>Terms</a> and <a href={REFUNDS_URL}>Refunds</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
