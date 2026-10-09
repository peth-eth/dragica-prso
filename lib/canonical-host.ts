export const CANONICAL_HOST = "dragicaprso.hr";
const LEGACY_WORKER_HOST = "dragica-prso.pethereum.workers.dev";

export function shouldRedirectToCanonicalHost(host: string | null): boolean {
  const normalizedHost = host?.toLowerCase();
  return normalizedHost === `www.${CANONICAL_HOST}` || normalizedHost === LEGACY_WORKER_HOST;
}
