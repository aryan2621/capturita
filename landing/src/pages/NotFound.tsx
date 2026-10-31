import { Link } from "../router";
import { PageHero, btnPrimary } from "../components/ui";

export default function NotFound() {
  return (
    <PageHero title="Page not found">
      <p>That page doesn&rsquo;t exist.</p>
      <div className="mt-8 flex justify-center"><Link to="/" className={btnPrimary}>Back to home</Link></div>
    </PageHero>
  );
}
