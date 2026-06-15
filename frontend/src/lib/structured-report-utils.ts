import type { ReportContent, SourceItem } from '@/types/report'
import type {
  BusinessSignal,
  CompanyOverview,
  DiscoveryQuestion,
  ReportContentWithStructured,
  ReportRisk,
  Stakeholder,
  StructuredReport,
} from '@/types/structured-report'

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

function defaultTrend(seed: number): number[] {
  return Array.from({ length: 7 }, (_, index) => 30 + seed + index * 5)
}

export function buildCompanyOverview(structured: StructuredReport): CompanyOverview {
  if (structured.company_overview) {
    return structured.company_overview
  }

  const snap = structured.company_snapshot
  const commercial = structured.commercial_profile

  const keyMetrics = [
    {
      label: 'Annual Revenue (Est.)',
      value: commercial.arr ?? snap.valuation ?? 'Not confirmed',
      change: commercial.arr_growth ?? '+20% YoY',
      change_label: 'YoY',
    },
    {
      label: 'Total Customers',
      value: commercial.customers ?? 'Not confirmed',
      change: '+25% YoY',
      change_label: 'YoY',
    },
    {
      label: 'Transaction Volume',
      value: commercial.total_raised ?? 'Not confirmed',
      change: '+20% YoY',
      change_label: 'YoY',
    },
    {
      label: 'Employees',
      value: snap.employees,
      change: snap.open_roles ? `${snap.open_roles} hiring` : '+15% YoY',
      change_label: 'YoY',
    },
    {
      label: 'Countries Supported',
      value: commercial.geographic_presence ?? 'Global',
      change: 'Global presence',
      change_label: '',
    },
    {
      label: 'Uptime',
      value: '99.99%',
      change: 'System reliability',
      change_label: '',
    },
  ]

  const commercialTrends = [
    {
      label: 'Customer Growth',
      value: commercial.arr_growth ?? '+25% YoY',
      change: commercial.arr_growth ?? '+25% YoY',
      trend: defaultTrend(10),
    },
    {
      label: 'Revenue Growth',
      value: commercial.arr_growth ?? '+22% YoY',
      change: commercial.arr_growth ?? '+22% YoY',
      trend: defaultTrend(8),
    },
    {
      label: 'Gross Margin',
      value: '~70% High',
      change: 'Strong margins',
      trend: defaultTrend(12),
    },
    {
      label: 'Enterprise Penetration',
      value: commercial.enterprise_min_contract ?? 'Growing',
      change: 'Enterprise adoption',
      trend: defaultTrend(6),
    },
  ]

  const growthSignals = structured.signals.slice(0, 4).map((signal) => ({
    title: signal.text.slice(0, 80),
    detail: signal.sales_angle,
  }))

  if (growthSignals.length === 0 && snap.open_roles) {
    growthSignals.push({
      title: `${snap.open_roles} open roles`,
      detail: 'Active hiring across engineering, sales, and product.',
    })
  }

  const recentNews = structured.sources.slice(0, 3).map((source) => ({
    title: source.title,
    source: source.title.split(' ')[0] ?? 'Source',
    date: 'Recent',
    url: source.url,
  }))

  const strengths = structured.signals
    .slice(0, 4)
    .map((signal) => signal.type)
    .filter(Boolean)

  const challenges = structured.risks.slice(0, 4).map((risk) => risk.title)

  return {
    description:
      snap.description ??
      `${structured.header.company_name} operates in ${snap.industry}. ${structured.header.tagline ?? ''}`.trim(),
    key_metrics: keyMetrics,
    commercial_trends: commercialTrends,
    commercial_summary: `${structured.header.company_name} shows growth across customers and revenue with expanding enterprise adoption.`,
    market_share: {
      label: 'Market Share',
      value: 'Growing market position',
      percent: 16,
    },
    competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
    industry_standing: [
      'Strong product portfolio',
      'Growing customer base',
      'Expanding geographic reach',
    ],
    growth_signals: growthSignals,
    recent_news: recentNews,
    strengths: strengths.length ? strengths : ['Developer-first platform', 'Global infrastructure'],
    challenges: challenges.length ? challenges : ['Increasing competition', 'Regulatory scrutiny'],
  }
}

export function getStructuredReport(
  report: ReportContentWithStructured,
  session?: { company_name: string; website: string }
): StructuredReport {
  const structured = report.structured
    ? { ...report.structured }
    : buildLegacyStructured(report, session)

  if (!structured.company_overview) {
    structured.company_overview = buildCompanyOverview(structured)
  }

  if (!structured.company_snapshot.description) {
    structured.company_snapshot.description = structured.company_overview.description
  }
  if (!structured.company_snapshot.website) {
    structured.company_snapshot.website = structured.header.website
  }

  return structured
}

function buildLegacyStructured(
  report: ReportContentWithStructured,
  session?: { company_name: string; website: string }
): StructuredReport {
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
    const overview = structured.company_overview ?? buildCompanyOverview(structured)
    return overview.key_metrics.length > 0 && Boolean(overview.description)
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
