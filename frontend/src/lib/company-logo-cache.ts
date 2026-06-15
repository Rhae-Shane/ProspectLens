import { extractCompanyDomain, getCompanyLogoCandidates } from "./company-logo";

const STORAGE_KEY = "prospectlens:company-logo-cache";
const memoryCache = new Map<string, string>();

function readStorage(): Record<string, string> {
  if (typeof sessionStorage === "undefined") return {};

  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeStorage(store: Record<string, string>) {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota errors.
  }
}

export function getCachedLogoUrl(domain: string): string | null {
  return memoryCache.get(domain) ?? readStorage()[domain] ?? null;
}

export function setCachedLogoUrl(domain: string, url: string) {
  memoryCache.set(domain, url);

  const store = readStorage();
  store[domain] = url;
  writeStorage(store);
}

function tryPrefetch(urls: string[], index: number, domain: string) {
  if (index >= urls.length) return;

  const image = new Image();
  image.onload = () => setCachedLogoUrl(domain, urls[index]!);
  image.onerror = () => tryPrefetch(urls, index + 1, domain);
  image.src = urls[index]!;
}

export function prefetchCompanyLogo(website: string) {
  const domain = extractCompanyDomain(website);
  if (!domain || getCachedLogoUrl(domain)) return;

  tryPrefetch(getCompanyLogoCandidates(website), 0, domain);
}

export function prefetchCompanyLogos(websites: string[]) {
  for (const website of websites) {
    prefetchCompanyLogo(website);
  }
}

export function resolveCompanyLogoUrl(website: string): string | null {
  const domain = extractCompanyDomain(website);
  if (!domain) return null;

  const cached = getCachedLogoUrl(domain);
  if (cached) return cached;

  const [first] = getCompanyLogoCandidates(website);
  return first ?? null;
}
