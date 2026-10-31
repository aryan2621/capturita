import { useSyncExternalStore, type AnchorHTMLAttributes } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

export const usePath = () => useSyncExternalStore(subscribe, () => location.pathname.replace(/(.)\/$/, "$1"));

export function navigate(to: string) {
  history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function Link({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === "_blank") return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}
