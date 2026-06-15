import type { ReportContent, SourceItem } from '@/types/report'
import type {
  BusinessSignal,
  DiscoveryQuestion,
  ReportContentWithStructured,
  ReportRisk,
  Stakeholder,
  StructuredReport,
} from '@/types/structured-report'
import { COMPANY_OVERVIEW_SECTION_IDS } from '@/types/structured-report'

function parseMarkdownFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^\*\*([^*]+)\*\*:\s*(.+)$/)
    if (match) {
      fields[match[1].toLowerCase().replace(/\s+/g, '_')] = match[2].trim()
    }
  }
  return fields
}

function parseBulletItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

export function getStructuredReport(
  report: ReportContentWithStructured,
  session?: { company_name: string; website: string }
): StructuredReport {
  if (report.structured) {
    return report.structured
  }

  const overview = parseMarkdownFields(report.company_overview)
  const commercial = parseMarkdownFields(report.company_overview)

  const discovery: DiscoveryQuestion[] = report.discovery_questions.map((question) => ({
    question,
    signal_source: 'Research synthesis',
    targets: 'discovery',
  }))

  const signals: BusinessSignal[] = parseBulletItems(report.business_signals).map((text) => ({
    type: 'Signal',
    date: 'Recent',
    text,
    sales_angle: 'Use in discovery',
  }))

  const risks: ReportRisk[] = parseBulletItems(report.risks_challenges).map((text, index) => ({
    title: `Risk ${index + 1}`,
    category: 'Operational',
    severity: 3,
    body: text,
    source: 'Research',
  }))

  const products = parseBulletItems(report.products_services).map((line) => ({
    name: line.split(':')[0]?.replace(/\*\*/g, '').trim() || 'Product',
    type: 'Offering',
    description: line,
    tag: '',
  }))

  const customers = parseBulletItems(report.target_customers).map((line) => ({
    segment: line.split(':')[0]?.replace(/\*\*/g, '').trim() || 'Segment',
    detail: line,
    named_customers: [],
  }))

  return {
    header: {
      company_name: session?.company_name ?? 'Company',
      website: session?.website ?? '',
      tagline: overview.industry ?? 'Research briefing',
      location: overview.hq ?? '',
      trigger_event: risks[0]
        ? {
            label: risks[0].title,
            severity: risks[0].severity >= 4 ? 'critical' : 'high',
          }
        : undefined,
    },
    company_snapshot: {
      industry: overview.industry ?? 'Not confirmed',
      founded: overview.founded ?? 'Not confirmed',
      hq: overview.hq ?? 'Not confirmed',
      employees: overview.employees ?? 'Not confirmed',
      status: overview.status ?? 'Private',
      valuation: overview.valuation ?? 'Not confirmed',
      funding_round: overview.funding_round,
      open_roles: overview.open_roles,
    },
    commercial_profile: {
      arr: commercial.arr,
      arr_growth: commercial.arr_growth,
      developers: commercial.developers,
      model: commercial.model,
      enterprise_min_contract: commercial.enterprise_min_contract,
      total_raised: commercial.total_raised,
      cash: commercial.cash,
      customers: commercial.customers,
      hiring: commercial.hiring,
      geographic_presence: commercial.geographic_presence,
    },
    products,
    target_customers: customers,
    stakeholders: [],
    signals,
    risks,
    discovery_questions: discovery,
    outreach: {
      channel: 'Email',
      hook: report.outreach_strategy.split('\n')[0] ?? '',
      sequence: [],
    },
    unknowns: report.unknowns,
    sources: report.sources as SourceItem[],
  }
}

export function getStakeholderInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function riskSeverityColor(severity: number): string {
  if (severity >= 5) return 'bg-red-500'
  if (severity >= 4) return 'bg-orange-500'
  if (severity >= 3) return 'bg-amber-500'
  return 'bg-yellow-500'
}

export function signalTypeColor(type: string): string {
  const key = type.toLowerCase()
  if (key.includes('funding')) return 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-300'
  if (key.includes('security')) return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'
  if (key.includes('leadership')) return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300'
  if (key.includes('product')) return 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300'
  return 'border-primary/30 bg-primary/10 text-primary'
}

export function isNavItemComplete(structured: StructuredReport, navId: string): boolean {
  if (navId === 'company_overview') {
    return COMPANY_OVERVIEW_SECTION_IDS.every((sectionId) => isSectionComplete(structured, sectionId))
  }
  return isSectionComplete(structured, navId)
}

export function isSectionComplete(structured: StructuredReport, sectionId: string): boolean {
  switch (sectionId) {
    case 'snapshot':
      return Boolean(structured.company_snapshot.industry)
    case 'commercial':
      return Object.values(structured.commercial_profile).some(Boolean)
    case 'products':
      return structured.products.length > 0
    case 'customers':
      return structured.target_customers.length > 0
    case 'stakeholders':
      return structured.stakeholders.length > 0
    case 'signals':
      return structured.signals.length > 0
    case 'risks':
      return structured.risks.length > 0
    case 'discovery':
      return structured.discovery_questions.length > 0
    case 'outreach':
      return Boolean(structured.outreach.hook)
    case 'unknowns':
      return structured.unknowns.length > 0
    case 'sources':
      return structured.sources.length > 0
    default:
      return false
  }
}
