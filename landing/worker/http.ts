/** fetch that gives up after `ms` so a slow upstream can never hang a request. */
export async function fetchT(url: string, init: RequestInit = {}, ms = 10_000): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}
