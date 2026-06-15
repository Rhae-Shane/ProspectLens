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
  features?: string[]
}

export interface PortfolioMetric {
  label: string
  value: string
}

export interface ProductCategory {
  name: string
  percent: number
}

export interface CoreProduct {
  name: string
  description: string
  features: string[]
  category: string
  category_color?: 'core' | 'risk' | 'analytics' | 'financial' | 'compliance' | 'default'
}

export interface AdditionalCapability {
  name: string
  description: string
}

export interface DeveloperNote {
  title: string
  text: string
}

export interface ProductsServicesOverview {
  summary: string
  portfolio_metrics: PortfolioMetric[]
  categories: ProductCategory[]
  core_products: CoreProduct[]
  additional_capabilities: AdditionalCapability[]
  developer_note?: DeveloperNote
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
  focus_areas?: string[]
  background?: string
  tag?: string
}

export interface StakeholderSummaryCount {
  label: string
  value: number
  hint: string
}

export interface StakeholderGroupBreakdown {
  name: string
  percent: number
  count: number
}

export interface ExecutiveStakeholder {
  name: string
  title: string
  tag?: string
  focus_areas: string[]
  background: string
  linkedin_url?: string
  image_url?: string
}

export interface NamedStakeholder {
  name: string
  role: string
  linkedin_url?: string
  image_url?: string
}

export interface EntityStakeholder {
  name: string
  type: 'investor' | 'partner' | 'board'
  website?: string
  image_url?: string
}

export interface OtherStakeholderGroup {
  label: string
  description: string
}

export interface StakeholdersOverview {
  summary_counts: StakeholderSummaryCount[]
  groups: StakeholderGroupBreakdown[]
  executives: ExecutiveStakeholder[]
  board_members: NamedStakeholder[]
  investors: EntityStakeholder[]
  partners: EntityStakeholder[]
  other_groups: OtherStakeholderGroup[]
}

export interface BusinessSignal {
  type: string
  date: string
  text: string
  sales_angle: string
}

export type SignalPolarity = 'positive' | 'neutral' | 'risk'
export type SignalImpact = 'high' | 'medium' | 'low'

export interface SignalSummaryCount {
  label: string
  value: number
  hint: string
  polarity: SignalPolarity
}

export interface OverallSignalStrength {
  score: number
  label: string
  change: string
  change_label: string
}

export interface SignalTrendPoint {
  month: string
  score: number
}

export interface KeyBusinessSignal {
  title: string
  category: string
  description: string
  impact: SignalImpact
  indicator: string
  trend: number[]
  polarity: SignalPolarity
}

export interface SignalCategoryBreakdown {
  name: string
  percent: number
  count: number
}

export interface RecentDevelopment {
  date: string
  title: string
  description: string
  category: string
}

export interface HighlightSignal {
  title: string
  metric: string
  impact: SignalImpact
  polarity: SignalPolarity
}

export interface BusinessSignalsOverview {
  summary_counts: SignalSummaryCount[]
  overall_strength: OverallSignalStrength
  signal_trend: SignalTrendPoint[]
  key_signals: KeyBusinessSignal[]
  categories: SignalCategoryBreakdown[]
  recent_developments: RecentDevelopment[]
  top_positive_signals: HighlightSignal[]
  key_risk_signals: HighlightSignal[]
}

export interface ReportRisk {
  title: string
  category: string
  severity: number
  body: string
  source?: string
}

export type RiskLevel = 'high' | 'medium' | 'low'

export interface RiskSummaryCount {
  label: string
  value: number
  hint: string
  level: RiskLevel
}

export interface RiskTrendPoint {
  month: string
  level: RiskLevel
  score: number
}

export interface TopRiskItem {
  title: string
  description: string
  category: string
  impact: RiskLevel
  likelihood: RiskLevel
  trend: number[]
  mitigation_status: 'In Progress' | 'Monitoring' | 'Mitigated' | 'Not Started'
}

export interface RiskCategoryBreakdown {
  name: string
  percent: number
  count: number
}

export interface HeatMapCell {
  impact: RiskLevel
  likelihood: RiskLevel
  count: number
}

export interface DetailedRiskInsight {
  title: string
  description: string
  potential_impact: RiskLevel
  time_horizon: string
  mitigation: string
  level: RiskLevel
}

export interface RisksChallengesOverview {
  summary_counts: RiskSummaryCount[]
  overall_risk_level: RiskLevel
  overall_status: string
  risk_trend: RiskTrendPoint[]
  top_risks: TopRiskItem[]
  categories: RiskCategoryBreakdown[]
  heat_map: HeatMapCell[]
  detailed_insights: DetailedRiskInsight[]
  key_challenges: string[]
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
  products_services?: ProductsServicesOverview
  risks_challenges?: RisksChallengesOverview
  business_signals?: BusinessSignalsOverview
  stakeholders_overview?: StakeholdersOverview
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

export const COMPANY_OVERVIEW_SECTION_IDS = ['snapshot', 'commercial'] as const satisfies readonly ReportSectionId[]

/** Top-level navigation groups shown in report VIEW menus. */
export const REPORT_NAV_ITEMS = [
  { id: 'company_overview', label: 'Company Overview', number: 1 },
  { id: 'products', label: 'Products & Services', number: 2 },
  { id: 'customers', label: 'Target Customers', number: 3 },
  { id: 'stakeholders', label: 'Stakeholders', number: 4 },
  { id: 'signals', label: 'Business Signals', number: 5 },
  { id: 'risks', label: 'Risks & Challenges', number: 6 },
  { id: 'discovery', label: 'Discovery Questions', number: 7 },
  { id: 'outreach', label: 'Outreach Strategy', number: 8 },
  { id: 'unknowns', label: 'Unknowns', number: 9 },
  { id: 'sources', label: 'Sources', number: 10 },
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
