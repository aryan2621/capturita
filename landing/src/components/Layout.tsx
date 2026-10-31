import type { ReactNode } from "react";
import Nav from "./Nav";
import Footer from "./Footer";
import { useReveal } from "./Motion";

export default function Layout({ children }: { children: ReactNode }) {
  useReveal();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:p-2">Skip to content</a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
