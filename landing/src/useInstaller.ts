// Installers are published to the shared public downloads repo as `capturita-vX.Y.Z` releases; the button opens that list so people pick the build.
export const RELEASES = "https://github.com/aryan2621/downloads/releases?q=capturita";

export type OS = "mac" | "other";

export function detectOS(): OS {
  return /Mac/i.test(navigator.userAgent) ? "mac" : "other";
}
