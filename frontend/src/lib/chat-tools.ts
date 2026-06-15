import type { ChatTool } from '@/types/report'

/** Canonical chat tools shown in the UI (kept in sync with backend CHAT_TOOL_DEFINITIONS). */
export const CHAT_TOOLS: ChatTool[] = [
  {
    id: 'web_search',
    label: 'Web Search',
    description: 'Search the web for up-to-date company facts not in the report',
    icon: 'globe',
  },
  {
    id: 'company_enrichment',
    label: 'Company Enrichment',
    description: 'Apollo firmographics: revenue, employees, funding, HQ, tech stack',
    icon: 'building',
  },
  {
    id: 'recent_news',
    label: 'Recent News',
    description: 'Latest news articles about the company',
    icon: 'newspaper',
  },
  {
    id: 'search_report',
    label: 'Search Report',
    description: 'Find relevant sections in the existing research briefing',
    icon: 'search',
  },
  {
    id: 'deep_research',
    label: 'Deep Research',
    description: 'Synthesized research with citations via Perplexity',
    icon: 'sparkles',
  },
  {
    id: 'scrape_website',
    label: 'Scrape Website',
    description: 'Read a company web page (pricing, careers, product docs)',
    icon: 'link',
  },
]

export function mergeChatTools(apiTools?: ChatTool[]): ChatTool[] {
  if (!apiTools?.length) return CHAT_TOOLS

  const apiById = new Map(apiTools.map((tool) => [tool.id, tool]))
  return CHAT_TOOLS.map((tool) => apiById.get(tool.id) ?? tool)
}
