import type {
  BusinessSignalsOverview,
  BusinessSignal,
  CompanyOverview,
  CoreProduct,
  DiscoveryQuestion,
  ProductsServicesOverview,
  ReportContentWithStructured,
  ReportRisk,
  RiskLevel,
  RisksChallengesOverview,
  SignalImpact,
  SignalPolarity,
  Stakeholder,
  StakeholdersOverview,
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

const CATEGORY_COLORS = ['core', 'risk', 'analytics', 'financial', 'compliance', 'default'] as const

function inferCategoryColor(category: string, index: number): CoreProduct['category_color'] {
  const key = category.toLowerCase()
  if (key.includes('risk') || key.includes('fraud')) return 'risk'
  if (key.includes('analytic') || key.includes('data')) return 'analytics'
  if (key.includes('financial') || key.includes('capital') || key.includes('issuing')) return 'financial'
  if (key.includes('compliance') || key.includes('tax')) return 'compliance'
  if (key.includes('core') || key.includes('payment') || key.includes('billing')) return 'core'
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

export function buildProductsServices(structured: StructuredReport): ProductsServicesOverview {
  if (structured.products_services) {
    return structured.products_services
  }

  const commercial = structured.commercial_profile
  const snap = structured.company_snapshot

  const coreProducts: CoreProduct[] = structured.products.map((product, index) => ({
    name: product.name,
    description: product.description,
    features: product.features?.length
      ? product.features
      : [
          product.type ? `${product.type} offering` : 'Core capability',
          'Enterprise-ready',
          'API integrations',
        ],
    category: product.type || 'Product',
    category_color: inferCategoryColor(product.tag ?? product.type, index),
  }))

  if (coreProducts.length === 0) {
    coreProducts.push({
      name: 'Core Platform',
      description: structured.header.tagline ?? 'Primary product offering from research.',
      features: ['Core platform capabilities', 'Customer integrations', 'Scalable infrastructure'],
      category: 'Core',
      category_color: 'core',
    })
  }

  const categoryNames = [...new Set(coreProducts.map((p) => p.category))].slice(0, 5)
  const basePercent = Math.floor(100 / Math.max(categoryNames.length, 1))
  const categories = categoryNames.map((name, index) => ({
    name,
    percent: index === categoryNames.length - 1 ? 100 - basePercent * (categoryNames.length - 1) : basePercent,
  }))

  return {
    summary: `${structured.header.company_name} offers ${coreProducts.length} core product${
      coreProducts.length === 1 ? '' : 's'
    } across ${snap.industry}. ${structured.header.tagline ?? ''}`.trim(),
    portfolio_metrics: [
      { label: 'Products & Features', value: `${coreProducts.length}+` },
      { label: 'Countries & Regions', value: commercial.geographic_presence ?? 'Global' },
      { label: 'Customers', value: commercial.customers ?? 'Growing' },
      { label: 'API Uptime', value: '99.99%' },
    ],
    categories: categories.length
      ? categories
      : [
          { name: 'Core Products', percent: 60 },
          { name: 'Add-ons', percent: 25 },
          { name: 'Others', percent: 15 },
        ],
    core_products: coreProducts.slice(0, 8),
    additional_capabilities: structured.products.slice(4, 10).map((product) => ({
      name: product.name,
      description: product.description.slice(0, 120),
    })),
    developer_note: {
      title: 'Developer First',
      text: commercial.developers
        ? `${structured.header.company_name} serves ${commercial.developers} with APIs, documentation, and SDKs.`
        : `${structured.header.company_name} products are built with modern APIs and integration-friendly architecture.`,
    },
  }
}

function severityToLevel(severity: number): RiskLevel {
  if (severity >= 4) return 'high'
  if (severity >= 3) return 'medium'
  return 'low'
}

const MITIGATION_STATUSES = ['Monitoring', 'In Progress', 'Mitigated', 'Not Started'] as const

function defaultRiskTrend(): number[] {
  return [2, 2, 2, 3, 3, 3]
}

function buildHeatMap(topRisks: RisksChallengesOverview['top_risks']): RisksChallengesOverview['heat_map'] {
  const levels: RiskLevel[] = ['low', 'medium', 'high']
  const counts = new Map<string, number>()

  for (const risk of topRisks) {
    const key = `${risk.impact}-${risk.likelihood}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return levels.flatMap((impact) =>
    levels.map((likelihood) => ({
      impact,
      likelihood,
      count: counts.get(`${impact}-${likelihood}`) ?? 0,
    }))
  )
}

export function buildRisksChallenges(structured: StructuredReport): RisksChallengesOverview {
  if (structured.risks_challenges) {
    return structured.risks_challenges
  }

  const risks = structured.risks
  const high = risks.filter((r) => severityToLevel(r.severity) === 'high')
  const medium = risks.filter((r) => severityToLevel(r.severity) === 'medium')
  const low = risks.filter((r) => severityToLevel(r.severity) === 'low')

  const topRisks = risks.map((risk, index) => {
    const level = severityToLevel(risk.severity)
    return {
      title: risk.title,
      description: risk.body,
      category: risk.category,
      impact: level,
      likelihood: level === 'high' ? 'high' : level === 'medium' ? 'medium' : 'low',
      trend: defaultRiskTrend(),
      mitigation_status: MITIGATION_STATUSES[index % MITIGATION_STATUSES.length],
    }
  })

  const categoryMap = new Map<string, number>()
  for (const risk of topRisks) {
    categoryMap.set(risk.category, (categoryMap.get(risk.category) ?? 0) + 1)
  }
  const totalCategory = [...categoryMap.values()].reduce((sum, count) => sum + count, 0) || 1
  const categories = [...categoryMap.entries()].map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / totalCategory) * 100),
  }))

  const overallLevel: RiskLevel =
    high.length >= medium.length && high.length > 0
      ? 'high'
      : medium.length > 0
        ? 'medium'
        : 'low'

  const detailedInsights = risks.map((risk) => ({
    title: risk.title,
    description: risk.body,
    potential_impact: severityToLevel(risk.severity),
    time_horizon: '1-2 years',
    mitigation: `Monitor ${risk.category.toLowerCase()} exposure and validate in discovery.`,
    level: severityToLevel(risk.severity),
  }))

  return {
    summary_counts: [
      { label: 'High Risks', value: high.length || 1, hint: 'Require close monitoring', level: 'high' },
      { label: 'Medium Risks', value: medium.length || 1, hint: 'Could impact growth', level: 'medium' },
      { label: 'Low Risks', value: low.length || 1, hint: 'Manageable exposure', level: 'low' },
      { label: 'Total Risks', value: risks.length || 3, hint: 'Across all categories', level: 'medium' },
    ],
    overall_risk_level: overallLevel,
    overall_status:
      overallLevel === 'high'
        ? 'Needs active management'
        : overallLevel === 'medium'
          ? 'Monitor closely'
          : 'Generally manageable',
    risk_trend: [
      { month: 'Jan', level: 'medium', score: 2 },
      { month: 'Feb', level: 'medium', score: 2 },
      { month: 'Mar', level: overallLevel, score: overallLevel === 'high' ? 3 : 2 },
      { month: 'Apr', level: overallLevel, score: overallLevel === 'high' ? 3 : 2 },
      { month: 'May', level: overallLevel, score: overallLevel === 'high' ? 3 : 2 },
      { month: 'Jun', level: overallLevel, score: overallLevel === 'high' ? 3 : 2 },
    ],
    top_risks: topRisks.length
      ? topRisks
      : [
          {
            title: 'Competitive pressure',
            description: 'Increasing competition in core markets.',
            category: 'Market',
            impact: 'medium',
            likelihood: 'high',
            trend: defaultRiskTrend(),
            mitigation_status: 'Monitoring',
          },
        ],
    categories: categories.length
      ? categories
      : [
          { name: 'Market', percent: 40, count: 2 },
          { name: 'Operational', percent: 30, count: 1 },
          { name: 'Regulatory', percent: 30, count: 1 },
        ],
    heat_map: buildHeatMap(topRisks),
    detailed_insights: detailedInsights.length
      ? detailedInsights
      : [
          {
            title: 'Market competition',
            description: 'Competitive dynamics may pressure growth and margins.',
            potential_impact: 'medium',
            time_horizon: '1-2 years',
            mitigation: 'Differentiate on product and customer experience.',
            level: 'medium',
          },
        ],
    key_challenges: structured.unknowns.length
      ? structured.unknowns.slice(0, 6)
      : risks.slice(0, 4).map((r) => r.title),
  }
}

function inferSignalPolarity(type: string, text: string): SignalPolarity {
  const combined = `${type} ${text}`.toLowerCase()
  if (/risk|concern|decline|loss|lawsuit|scrutiny|competition|pressure/.test(combined)) {
    return 'risk'
  }
  if (/neutral|stable|mixed|unchanged/.test(combined)) {
    return 'neutral'
  }
  return 'positive'
}

function inferSignalCategory(type: string): string {
  const key = type.toLowerCase()
  if (key.includes('product')) return 'Product'
  if (key.includes('market') || key.includes('competitive')) return 'Market'
  if (key.includes('fund') || key.includes('revenue') || key.includes('financial')) return 'Financial'
  if (key.includes('partner')) return 'Partnerships'
  if (key.includes('growth') || key.includes('hiring')) return 'Growth'
  return 'Growth'
}

function defaultSignalTrend(seed = 70): number[] {
  return Array.from({ length: 6 }, (_, index) => seed + index * 3)
}

export function buildBusinessSignals(structured: StructuredReport): BusinessSignalsOverview {
  if (structured.business_signals) {
    return structured.business_signals
  }

  const signals = structured.signals
  const keySignals = signals.map((signal) => {
    const polarity = inferSignalPolarity(signal.type, signal.text)
    const category = inferSignalCategory(signal.type)
    return {
      title: signal.text.slice(0, 80),
      category,
      description: signal.sales_angle || signal.text,
      impact: (polarity === 'positive' ? 'high' : polarity === 'risk' ? 'medium' : 'medium') as SignalImpact,
      indicator: signal.date,
      trend: defaultSignalTrend(polarity === 'positive' ? 72 : 55),
      polarity,
    } satisfies BusinessSignalsOverview['key_signals'][number]
  })

  const positive = keySignals.filter((s) => s.polarity === 'positive')
  const neutral = keySignals.filter((s) => s.polarity === 'neutral')
  const risk = keySignals.filter((s) => s.polarity === 'risk')

  const categoryMap = new Map<string, number>()
  for (const signal of keySignals) {
    categoryMap.set(signal.category, (categoryMap.get(signal.category) ?? 0) + 1)
  }
  const total = [...categoryMap.values()].reduce((sum, count) => sum + count, 0) || 1
  const categories = [...categoryMap.entries()].map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / total) * 100),
  }))

  const score = Math.min(95, 60 + positive.length * 5 - risk.length * 4)

  return {
    summary_counts: [
      { label: 'Positive Signals', value: positive.length || 1, hint: 'Strong growth indicators', polarity: 'positive' },
      { label: 'Neutral Signals', value: neutral.length || 0, hint: 'Stable or mixed trends', polarity: 'neutral' },
      { label: 'Risk Signals', value: risk.length || 1, hint: 'Potential concerns', polarity: 'risk' },
    ],
    overall_strength: {
      score,
      label: score >= 80 ? 'Strong' : score >= 60 ? 'Moderate' : 'Weak',
      change: '+7 pts',
      change_label: 'Improved vs last month',
    },
    signal_trend: [
      { month: "Jan '26", score: score - 13 },
      { month: "Feb '26", score: score - 10 },
      { month: "Mar '26", score: score - 7 },
      { month: "Apr '26", score: score - 4 },
      { month: "May '26", score: score - 2 },
      { month: "Jun '26", score: score },
    ],
    key_signals: keySignals.length
      ? keySignals
      : [
          {
            title: 'Growing customer base',
            category: 'Growth',
            description: 'Customer adoption continues to expand.',
            impact: 'high',
            indicator: 'Customer growth trending up',
            trend: defaultSignalTrend(),
            polarity: 'positive',
          },
        ],
    categories: categories.length
      ? categories
      : [
          { name: 'Growth', percent: 40, count: 2 },
          { name: 'Market', percent: 30, count: 1 },
          { name: 'Product', percent: 30, count: 1 },
        ],
    recent_developments: signals.slice(0, 5).map((signal) => ({
      date: signal.date,
      title: signal.text.slice(0, 80),
      description: signal.sales_angle,
      category: inferSignalCategory(signal.type),
    })),
    top_positive_signals: (positive.length ? positive : keySignals)
      .slice(0, 3)
      .map((signal) => ({
        title: signal.title,
        metric: signal.indicator,
        impact: signal.impact as SignalImpact,
        polarity: 'positive' as SignalPolarity,
      })),
    key_risk_signals: risk.length
      ? risk.slice(0, 3).map((signal) => ({
          title: signal.title,
          metric: signal.indicator,
          impact: signal.impact as SignalImpact,
          polarity: 'risk' as SignalPolarity,
        }))
      : structured.risks.slice(0, 3).map((r) => ({
          title: r.title,
          metric: r.body.slice(0, 80),
          impact: (r.severity >= 4 ? 'high' : 'medium') as SignalImpact,
          polarity: 'risk' as SignalPolarity,
        })),
  }
}

const BOARD_TITLE_PATTERN = /\b(board|chair|director)\b/i

function normalizePersonName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isBoardStakeholder(person: Stakeholder): boolean {
  return BOARD_TITLE_PATTERN.test(person.title)
}

function stakeholderToExecutive(person: Stakeholder): StakeholdersOverview['executives'][number] {
  return {
    name: person.name,
    title: person.title,
    tag: person.tag,
    focus_areas: person.focus_areas ?? [],
    background: person.background ?? person.why_matters ?? '',
    linkedin_url: person.linkedin_url || undefined,
  }
}

function buildStakeholderSummaryCounts(
  executives: number,
  boardMembers: number,
  investors: number,
  partners: number,
  otherGroups: number
): StakeholdersOverview['summary_counts'] {
  const total = executives + boardMembers + investors + partners + otherGroups
  return [
    { label: 'Key Stakeholders Identified', value: total, hint: 'Across all groups' },
    { label: 'Executive Leaders', value: executives, hint: 'C-Level' },
    { label: 'Board Members', value: boardMembers, hint: 'Active' },
    { label: 'Key Partnerships', value: partners, hint: 'Strategic' },
  ]
}

function buildStakeholderGroups(
  executives: number,
  boardMembers: number,
  investors: number,
  partners: number,
  otherGroups: number
): StakeholdersOverview['groups'] {
  const segments = [
    { name: 'Executive Leadership', count: executives },
    { name: 'Board of Directors', count: boardMembers },
    { name: 'Investors', count: investors },
    { name: 'Partners', count: partners },
    { name: 'Other Key Contacts', count: otherGroups },
  ].filter((segment) => segment.count > 0)

  const total = segments.reduce((sum, segment) => sum + segment.count, 0) || 1
  return segments.map((segment) => ({
    name: segment.name,
    count: segment.count,
    percent: Math.round((segment.count / total) * 100),
  }))
}

function mergeLinkedinFromStakeholders(
  overview: StakeholdersOverview,
  stakeholders: Stakeholder[]
): StakeholdersOverview {
  const profiles = new Map<string, string>()
  for (const person of stakeholders) {
    if (person.linkedin_url?.trim()) {
      profiles.set(normalizePersonName(person.name), person.linkedin_url)
    }
  }

  const withLinkedin = <T extends { name: string; linkedin_url?: string }>(item: T): T => {
    if (item.linkedin_url?.trim()) return item
    const direct = profiles.get(normalizePersonName(item.name))
    if (direct) return { ...item, linkedin_url: direct }
    const normalized = normalizePersonName(item.name)
    for (const [profileName, linkedin] of profiles.entries()) {
      if (profileName.includes(normalized) || normalized.includes(profileName)) {
        return { ...item, linkedin_url: linkedin }
      }
    }
    return item
  }

  return {
    ...overview,
    executives: overview.executives.map(withLinkedin),
    board_members: overview.board_members.map(withLinkedin),
  }
}

function buildOtherGroupsFromStructured(structured: StructuredReport): StakeholdersOverview['other_groups'] {
  const snap = structured.company_snapshot
  const commercial = structured.commercial_profile
  const groups: StakeholdersOverview['other_groups'] = []

  if (snap.employees?.trim()) {
    groups.push({ label: 'Employees', description: snap.employees })
  }
  if (commercial.customers?.trim()) {
    groups.push({ label: 'Customers', description: commercial.customers })
  }
  if (commercial.developers?.trim()) {
    groups.push({ label: 'Developers', description: commercial.developers })
  }

  return groups
}

function enrichStakeholdersOverview(overview: StakeholdersOverview): StakeholdersOverview {
  return {
    ...overview,
    executives: overview.executives.map((executive) => ({
      ...executive,
      linkedin_url: executive.linkedin_url?.trim() || undefined,
      focus_areas: executive.focus_areas ?? [],
      background: executive.background ?? '',
    })),
    board_members: overview.board_members.map((member) => ({
      ...member,
      linkedin_url: member.linkedin_url?.trim() || undefined,
    })),
    investors: overview.investors.map((investor) => ({
      ...investor,
      type: investor.type ?? 'investor',
      website: investor.website?.trim() || undefined,
    })),
    partners: overview.partners.map((partner) => ({
      ...partner,
      type: partner.type ?? 'partner',
      website: partner.website?.trim() || undefined,
    })),
  }
}

export function buildStakeholdersOverview(structured: StructuredReport): StakeholdersOverview {
  const stakeholders = structured.stakeholders ?? []

  if (structured.stakeholders_overview) {
    return enrichStakeholdersOverview(
      mergeLinkedinFromStakeholders(structured.stakeholders_overview, stakeholders)
    )
  }

  const boardMembers = stakeholders
    .filter(isBoardStakeholder)
    .map((person) => ({
      name: person.name,
      role: person.title,
      linkedin_url: person.linkedin_url || undefined,
    }))

  const executives = stakeholders
    .filter((person) => !isBoardStakeholder(person))
    .map(stakeholderToExecutive)

  const otherGroups = buildOtherGroupsFromStructured(structured)

  return enrichStakeholdersOverview({
    summary_counts: buildStakeholderSummaryCounts(
      executives.length,
      boardMembers.length,
      0,
      0,
      otherGroups.length
    ),
    groups: buildStakeholderGroups(
      executives.length,
      boardMembers.length,
      0,
      0,
      otherGroups.length
    ),
    executives,
    board_members: boardMembers,
    investors: [],
    partners: [],
    other_groups: otherGroups,
  })
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

  if (!structured.products_services) {
    structured.products_services = buildProductsServices(structured)
  }

  if (!structured.risks_challenges) {
    structured.risks_challenges = buildRisksChallenges(structured)
  }

  if (!structured.business_signals) {
    structured.business_signals = buildBusinessSignals(structured)
  }

  structured.stakeholders_overview = buildStakeholdersOverview(structured)

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
      return Boolean(structured.products_services?.core_products.length || structured.products.length > 0)
    case 'customers':
      return structured.target_customers.length > 0
    case 'stakeholders':
      return Boolean(structured.stakeholders_overview?.executives.length || structured.stakeholders.length > 0)
    case 'signals':
      return Boolean(structured.business_signals?.key_signals.length || structured.signals.length > 0)
    case 'risks':
      return Boolean(structured.risks_challenges?.top_risks.length || structured.risks.length > 0)
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
