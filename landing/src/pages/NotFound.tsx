import { Link } from "../router";
import { PageHero, btnPrimary, btnSecondary } from "../components/ui";

const links: [string, string][] = [["/features", "Features"], ["/pricing", "Pricing"], ["/download", "Download"], ["/support", "Support"]];

export default function NotFound() {
  return (
    <PageHero title="Page not found">
      <p>That page doesn&rsquo;t exist, or it has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={btnPrimary}>Back to home</Link>
        {links.map(([to, label]) => <Link key={to} to={to} className={btnSecondary}>{label}</Link>)}
      </div>
    </PageHero>
  );
}
