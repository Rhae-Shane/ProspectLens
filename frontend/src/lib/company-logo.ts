export function extractCompanyDomain(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "");
    return host || null;
  } catch {
    return null;
  }
}

export function getClearbitLogoUrl(domain: string) {
  return `https://logo.clearbit.com/${domain}`;
}

export function getGoogleFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function getCompanyLogoCandidates(website: string): string[] {
  const domain = extractCompanyDomain(website);
  if (!domain) return [];

  return [getClearbitLogoUrl(domain), getGoogleFaviconUrl(domain)];
}
