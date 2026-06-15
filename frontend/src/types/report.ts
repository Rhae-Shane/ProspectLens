export interface SourceItem {
  title: string
  url: string
  snippet: string
}

export interface ReportContent {
  company_overview: string
  products_services: string
  target_customers: string
  business_signals: string
  risks_challenges: string
  discovery_questions: string[]
  outreach_strategy: string
  unknowns: string[]
  sources: SourceItem[]
  structured?: import('./structured-report').StructuredReport
}

export interface Session {
  id: string
  company_name: string
  website: string
  objective: string
  status: string
  workflow_status: string
  total_tokens: number
  total_cost_usd: number
  error_message?: string
  created_at: string
  updated_at: string
  report?: ReportContent
}

export interface SessionListResponse {
  items: Session[]
  total: number
  page: number
  page_size: number
}

export interface WorkflowEvent {
  id: string
  node: string
  event_type: string
  payload: Record<string, unknown>
  tokens: number
  cost_usd: number
  duration_ms: number
  created_at: string
}

export interface ChatTool {
  id: string
  label: string
  description: string
  icon: string
}

export interface ChatToolUsage {
  tool: string
  query?: string
  provider?: string
  sources?: SourceItem[]
}

export interface ChatMessageMetadata {
  tools?: string[]
  tools_used?: ChatToolUsage[]
}

export interface ChatMessage {
  id: string
  role: string
  content: string
  tokens: number
  metadata?: ChatMessageMetadata
  created_at: string
}

export interface CreateSessionPayload {
  company_name: string
  website: string
  objective: string
}
