import { Link } from "../router";
import { SUPPORT_EMAIL } from "../config";
import { LegalPage, LegalSection } from "../components/ui";
import { RecoverKey } from "../components/RecoverKey";

const fixes = [
  ["Screen recording is blank", "Open System Settings → Privacy & Security → Screen & System Audio Recording, enable Capturita, then quit and reopen the app."],
  ["Microphone or camera is unavailable", "Check the relevant permission under System Settings → Privacy & Security. Microphone and Camera access are optional."],
  ["Capturita will not open", "Unsigned downloads may require approval in System Settings → Privacy & Security. The install page includes the steps."],
  ["A Pro key is not accepted", "Check that the full key was copied, including the period between its two parts. A key unlocks up to 2 Macs and official builds released within the update period. If you see a device-limit message, choose Remove in Settings → License on one of those Macs, or email support. The first activation needs the internet."],
];

export default function Support() {
  return (
    <LegalPage title="Support" intro="Help with installation, recording, or your Pro purchase.">
      <LegalSection title="Troubleshooting">
        <ul>
          {fixes.map(([q, a]) => <li key={q}><strong>{q}.</strong> {a}</li>)}
        </ul>
      </LegalSection>

      <LegalSection title="Install and activate">
        <p>The <Link to="/download">download page</Link> has the installation steps, including what to do when macOS blocks the app, and how to activate your Pro key.</p>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>Refund requests are covered on the <Link to="/refunds">refunds page</Link>.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with what you tried and what you saw.</p>
      </LegalSection>

      <LegalSection title="Lost your key?">
        <p>Enter the email you bought with and the payment ID from your Razorpay receipt email.</p>
        <RecoverKey />
        <p>No receipt? Write from your purchase email address and we will help.</p>
      </LegalSection>
    </LegalPage>
  );
}
