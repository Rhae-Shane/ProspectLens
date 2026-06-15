import type { ReportContent, SourceItem } from './report'

export interface TriggerEvent {
  label: string
  severity: 'critical' | 'high' | 'medium'
}

export interface ReportHeader {
  company_name: string
  website: string
  tagline?: string
  location?: string
  trigger_event?: TriggerEvent
}

export interface SnapshotField {
  industry: string
  founded: string
  hq: string
  employees: string
  status: string
  valuation: string
  funding_round?: string
  open_roles?: string
  ceo?: string
  company_type?: string
  latest_funding?: string
  description?: string
  website?: string
}

export interface KeyMetric {
  label: string
  value: string
  change?: string
  change_label?: string
}

export interface CommercialTrend {
  label: string
  value: string
  change: string
  trend: number[]
}

export interface RecentNewsItem {
  title: string
  source: string
  date: string
  url?: string
}

export interface GrowthSignalItem {
  title: string
  detail: string
}

export interface MarketShareInfo {
  label: string
  value: string
  percent: number
}

export interface CompanyOverview {
  description: string
  key_metrics: KeyMetric[]
  commercial_trends: CommercialTrend[]
  commercial_summary?: string
  market_share?: MarketShareInfo
  competitors: string[]
  industry_standing: string[]
  growth_signals: GrowthSignalItem[]
  recent_news: RecentNewsItem[]
  strengths: string[]
  challenges: string[]
}

export interface CommercialField {
  arr?: string
  arr_growth?: string
  developers?: string
  model?: string
  enterprise_min_contract?: string
  total_raised?: string
  cash?: string
  customers?: string
  hiring?: string
  geographic_presence?: string
}

export interface ReportProduct {
  name: string
  type: string
  description: string
  tag?: string
}

export interface TargetCustomer {
  segment: string
  detail: string
  named_customers?: string[]
}

export interface Stakeholder {
  name: string
  title: string
  tenure?: string
  previous_company?: string
  linkedin_url?: string
  why_matters: string
  conversation_hook: string
}

export interface BusinessSignal {
  type: string
  date: string
  text: string
  sales_angle: string
}

export interface ReportRisk {
  title: string
  category: string
  severity: number
  body: string
  source?: string
}

export interface DiscoveryQuestion {
  question: string
  signal_source: string
  targets?: string
}

export interface OutreachSequenceStep {
  day: number
  action: string
  angle?: string
}

export interface OutreachStrategy {
  channel: string
  primary_contact?: string
  hook: string
  avoid?: string[]
  sequence: OutreachSequenceStep[]
}

export interface StructuredReport {
  header: ReportHeader
  company_snapshot: SnapshotField
  commercial_profile: CommercialField
  company_overview?: CompanyOverview
  products: ReportProduct[]
  target_customers: TargetCustomer[]
  stakeholders: Stakeholder[]
  signals: BusinessSignal[]
  risks: ReportRisk[]
  discovery_questions: DiscoveryQuestion[]
  outreach: OutreachStrategy
  unknowns: string[]
  sources: SourceItem[]
}

export type ReportContentWithStructured = ReportContent & {
  structured?: StructuredReport
}

/** Granular content sections rendered inside nav groups. */
export const REPORT_SECTIONS = [
  { id: 'snapshot', label: 'Company Snapshot', number: 1 },
  { id: 'commercial', label: 'Commercial Profile', number: 2 },
  { id: 'products', label: 'Products & Services', number: 3 },
  { id: 'customers', label: 'Target Customers', number: 4 },
  { id: 'stakeholders', label: 'Stakeholders', number: 5 },
  { id: 'signals', label: 'Business Signals', number: 6 },
  { id: 'risks', label: 'Risks & Challenges', number: 7 },
  { id: 'discovery', label: 'Discovery Questions', number: 8 },
  { id: 'outreach', label: 'Outreach Strategy', number: 9 },
  { id: 'unknowns', label: 'Unknowns', number: 10 },
  { id: 'sources', label: 'Sources', number: 11 },
] as const

export type ReportSectionId = (typeof REPORT_SECTIONS)[number]['id']

export const COMPANY_OVERVIEW_SECTION_IDS = ['snapshot', 'commercial', 'stakeholders'] as const satisfies readonly ReportSectionId[]

/** Top-level navigation groups shown in report VIEW menus. */
export const REPORT_NAV_ITEMS = [
  { id: 'company_overview', label: 'Company Overview', number: 1 },
  { id: 'products', label: 'Products & Services', number: 2 },
  { id: 'customers', label: 'Target Customers', number: 3 },
  { id: 'signals', label: 'Business Signals', number: 4 },
  { id: 'risks', label: 'Risks & Challenges', number: 5 },
  { id: 'discovery', label: 'Discovery Questions', number: 6 },
  { id: 'outreach', label: 'Outreach Strategy', number: 7 },
  { id: 'unknowns', label: 'Unknowns', number: 8 },
  { id: 'sources', label: 'Sources', number: 9 },
] as const

export type ReportNavId = (typeof REPORT_NAV_ITEMS)[number]['id']

/** Full sidebar sections for report workspace (matches briefing layout). */
export const REPORT_WORKSPACE_SECTIONS = [
  { id: 'company_overview', label: 'Company Overview' },
  { id: 'products', label: 'Products & Services' },
  { id: 'customers', label: 'Target Customers' },
  { id: 'stakeholders', label: 'Stakeholders' },
  { id: 'signals', label: 'Business Signals' },
  { id: 'risks', label: 'Risks & Challenges' },
  { id: 'discovery', label: 'Discovery Questions' },
  { id: 'outreach', label: 'Outreach Strategy' },
  { id: 'unknowns', label: 'Unknowns' },
  { id: 'sources', label: 'Sources' },
] as const

export type ReportWorkspaceSectionId = (typeof REPORT_WORKSPACE_SECTIONS)[number]['id'] | 'chat'
