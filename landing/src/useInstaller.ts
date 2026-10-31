import { useEffect, useState } from "react";

// Installers are published to the shared public downloads repo as `capturita-vX.Y.Z` releases.
export const RELEASES = "https://github.com/aryan2621/downloads/releases?q=capturita";
const RELEASES_API = "https://api.github.com/repos/aryan2621/downloads/releases?per_page=50";

export type OS = "mac" | "other";

export function detectOS(): OS {
  return /Mac/i.test(navigator.userAgent) ? "mac" : "other";
}

type Release = { tag_name: string; draft: boolean; prerelease: boolean; assets: { name: string; browser_download_url: string }[] };

/** Direct link to the latest Apple-silicon installer, or null (the button opens the releases page). */
export function useInstaller(o: OS) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (o !== "mac") return;
    let active = true;
    fetch(RELEASES_API)
      .then((r) => {
        if (!r.ok) throw new Error(`GitHub release lookup failed (${r.status})`);
        return r.json();
      })
      .then((releases: Release[]) => {
        const latest = releases.find((release) => release.tag_name.startsWith("capturita-v") && !release.draft && !release.prerelease && release.assets.some((asset) => asset.name.endsWith("_aarch64.dmg")));
        const download = latest?.assets.find((asset) => asset.name.endsWith("_aarch64.dmg"))?.browser_download_url ?? null;
        if (active) setUrl(download);
      })
      .catch((error: unknown) => {
        console.warn("Could not look up the latest Capturita download; using the releases page.", error);
        if (active) setUrl(null);
      });
    return () => { active = false; };
  }, [o]);
  return url;
}
