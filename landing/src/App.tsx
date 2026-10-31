import { useEffect, type ComponentType } from "react";
import { usePath } from "./router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Download from "./pages/Download";
import Features from "./pages/Features";
import Support from "./pages/Support";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refunds from "./pages/Refunds";
import Success from "./pages/Success";
import { BuyProvider } from "./components/Buy";
import NotFound from "./pages/NotFound";

const routes: Record<string, [ComponentType, string]> = {
  "/": [Home, "Capturita — screen recorder and editor for macOS"],
  "/pricing": [Pricing, "Pricing · Capturita"],
  "/features": [Features, "Features · Capturita"],
  "/download": [Download, "Download · Capturita"],
  "/support": [Support, "Support · Capturita"],
  "/privacy": [Privacy, "Privacy · Capturita"],
  "/terms": [Terms, "Terms · Capturita"],
  "/refunds": [Refunds, "Refunds · Capturita"],
  "/success": [Success, "Thank you · Capturita"],
};

export default function App() {
  const path = usePath();
  const [Page, title] = routes[path] ?? [NotFound, "Not found · Capturita"];
  useEffect(() => {
    document.title = title;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path, title]);
  return <BuyProvider><Layout><Page /></Layout></BuyProvider>;
}
