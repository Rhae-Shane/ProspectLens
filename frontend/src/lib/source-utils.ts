import type { SourceItem } from '@/types/report'

export type SourceCategory =
  | 'Company'
  | 'News'
  | 'G2 Reviews'
  | 'Reddit'
  | 'Product Hunt'
  | 'LinkedIn'
  | 'Social'
  | 'Research'
  | 'Other'

export const CATEGORY_ORDER: SourceCategory[] = [
  'Company',
  'Research',
  'News',
  'G2 Reviews',
  'Reddit',
  'Product Hunt',
  'LinkedIn',
  'Social',
  'Other',
]

export function inferSourceCategory(url: string, title = ''): SourceCategory {
  const combined = `${url} ${title}`.toLowerCase()

  if (combined.includes('g2.com')) return 'G2 Reviews'
  if (combined.includes('reddit.com')) return 'Reddit'
  if (combined.includes('producthunt.com')) return 'Product Hunt'
  if (combined.includes('linkedin.com')) return 'LinkedIn'
  if (
    combined.includes('twitter.com') ||
    combined.includes('x.com') ||
    combined.includes('facebook.com') ||
    combined.includes('instagram.com')
  ) {
    return 'Social'
  }
  if (
    combined.includes('news') ||
    combined.includes('techcrunch') ||
    combined.includes('bloomberg') ||
    combined.includes('reuters') ||
    combined.includes('forbes') ||
    combined.includes('venturebeat')
  ) {
    return 'News'
  }
  if (title.toLowerCase().includes('(apollo)') || combined.includes('apollo.io')) {
    return 'Research'
  }

  return 'Other'
}

export function groupSourcesByCategory(sources: SourceItem[]): Record<SourceCategory, SourceItem[]> {
  const groups = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, [] as SourceItem[]])
  ) as Record<SourceCategory, SourceItem[]>

  for (const source of sources) {
    const category = inferSourceCategory(source.url, source.title)
    groups[category].push(source)
  }

  return groups
}

export function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    perplexity: 'Perplexity',
    tavily: 'Tavily',
    newsapi: 'NewsAPI',
    firecrawl: 'Firecrawl',
    apollo: 'Apollo',
    producthunt: 'Product Hunt',
  }
  return labels[provider] ?? provider
}

export function providerColor(provider: string): string {
  const colors: Record<string, string> = {
    perplexity: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/40',
    tavily: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
    newsapi: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900/40',
    firecrawl: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40',
    apollo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40',
    producthunt: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40',
  }
  return colors[provider] ?? 'bg-muted text-muted-foreground border-border'
}
