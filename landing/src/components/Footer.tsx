import { Link } from "../router";
import { LEGAL_NAME, SUPPORT_EMAIL } from "../config";
import { wrap } from "./ui";

const col = "flex flex-col gap-1 [&_a]:flex [&_a]:min-h-8 [&_a]:items-center [&_a:hover]:text-foreground";
const head = "mb-1 font-medium text-foreground";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-forest py-12 text-sm text-muted-foreground">
      <div className={`${wrap} grid grid-cols-2 gap-8 sm:grid-cols-3`}>
        <div className={col}>
          <h2 className={head}>Product</h2>
          <Link to="/">Home</Link><Link to="/features">Features</Link><Link to="/pricing">Pricing</Link><Link to="/download">Download</Link>
        </div>
        <div className={col}>
          <h2 className={head}>Legal</h2>
          <Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/refunds">Refunds</Link>
        </div>
        <div className={col}>
          <h2 className={head}>Support</h2>
          <Link to="/support">Help</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
      <p className={`${wrap} mt-8`}>© 2026 {LEGAL_NAME}. All rights reserved.</p>
    </footer>
  );
}
