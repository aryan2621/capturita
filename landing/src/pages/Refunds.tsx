import { SUPPORT_EMAIL } from "../config";
import { LegalPage, LegalSection } from "../components/ui";

export default function Refunds() {
  return (
    <LegalPage title="Refunds" intro="A 14-day money-back guarantee on Capturita Pro.">
      <LegalSection title="14-day money-back guarantee">
        <p>If Capturita Pro does not meet your expectations, you can ask for a full refund within 14 days of purchase. No reason is required.</p>
      </LegalSection>

      <LegalSection title="How to request a refund">
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with:</p>
        <ul>
          <li>Your purchase email address</li>
          <li>Your order ID (it starts with <code>ord_</code> and is on your thank-you page; if you no longer have it, the payment ID from your receipt works too)</li>
        </ul>
        <p>Refund requests are reviewed by email. Once a refund is issued, the Pro key is marked revoked. Official builds disable it at their next successful license check; if the service is unreachable, the app may allow up to 30 days of offline use after the last successful check.</p>
      </LegalSection>

      <LegalSection title="Processing time">
        <p>Once approved, the refund goes back to your original payment method (bank account, UPI handle, or card) via Razorpay. It usually shows up within 5 to 7 business days, depending on your bank.</p>
      </LegalSection>
    </LegalPage>
  );
}
