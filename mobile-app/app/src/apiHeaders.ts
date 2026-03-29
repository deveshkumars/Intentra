/**
 * Shared fetch headers for progress server (ngrok interstitial + optional INTENTRA_TOKEN).
 */

const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' } as const;

export function progressFetchHeaders(authToken: string | null | undefined): Record<string, string> {
  const h: Record<string, string> = { ...NGROK_HEADERS };
  const t = authToken?.trim();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}
