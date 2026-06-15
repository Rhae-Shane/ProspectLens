import { getClearbitLogoUrl, getGoogleFaviconUrl } from '@/lib/company-logo'

/** Known investor, partner, and company name → domain mappings. */
const ENTITY_DOMAINS: Record<string, string> = {
  'sequoia capital': 'sequoiacap.com',
  'andreessen horowitz': 'a16z.com',
  a16z: 'a16z.com',
  'general catalyst': 'generalcatalyst.com',
  'tiger global management': 'tigerglobal.com',
  'tiger global': 'tigerglobal.com',
  'kleiner perkins': 'kleinerperkins.com',
  accel: 'accel.com',
  benchmark: 'benchmark.com',
  'index ventures': 'indexventures.com',
  lightspeed: 'lsvp.com',
  'bessemer venture partners': 'bvp.com',
  bessemer: 'bvp.com',
  greylock: 'greylock.com',
  'insight partners': 'insightpartners.com',
  'coatue management': 'coatue.com',
  coatue: 'coatue.com',
  shopify: 'shopify.com',
  salesforce: 'salesforce.com',
  aws: 'aws.amazon.com',
  'amazon web services': 'aws.amazon.com',
  microsoft: 'microsoft.com',
  visa: 'visa.com',
  paypal: 'paypal.com',
  stripe: 'stripe.com',
  google: 'google.com',
  apple: 'apple.com',
  meta: 'meta.com',
  facebook: 'meta.com',
  adyen: 'adyen.com',
  square: 'squareup.com',
  block: 'block.xyz',
  'checkout.com': 'checkout.com',
  intuit: 'intuit.com',
  oracle: 'oracle.com',
  sap: 'sap.com',
  hubspot: 'hubspot.com',
  twilio: 'twilio.com',
  plaid: 'plaid.com',
  brex: 'brex.com',
  ramp: 'ramp.com',
  mercury: 'mercury.com',
  openai: 'openai.com',
  anthropic: 'anthropic.com',
  ycombinator: 'ycombinator.com',
  'y combinator': 'ycombinator.com',
}

function normalizeEntityName(name: string): string {
  return name.toLowerCase().replace(/[.,]/g, '').trim()
}

export function guessEntityDomain(name: string): string | null {
  const normalized = normalizeEntityName(name)
  if (ENTITY_DOMAINS[normalized]) {
    return ENTITY_DOMAINS[normalized]
  }

  for (const [key, domain] of Object.entries(ENTITY_DOMAINS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return domain
    }
  }

  const slug = normalized
    .replace(/\s+(capital|ventures|partners|management|vc|llc|inc|corp|group)$/i, '')
    .replace(/[^a-z0-9]+/g, '')
  if (slug.length >= 3) {
    return `${slug}.com`
  }

  return null
}

export function getEntityLogoUrls(name: string, website?: string): string[] {
  const domain = website?.trim() || guessEntityDomain(name)
  if (!domain) return []

  const host = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return [getClearbitLogoUrl(host), getGoogleFaviconUrl(host)]
}

export function linkedinProfileSlug(url?: string): string | null {
  if (!url?.trim()) return null
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  return match?.[1] ?? null
}

export function getPersonAvatarUrls(name: string, linkedinUrl?: string): string[] {
  const slug = linkedinProfileSlug(linkedinUrl)
  const urls: string[] = []

  if (slug) {
    urls.push(`https://unavatar.io/linkedin/${slug}`)
  }

  urls.push(
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`
  )

  return urls
}
