export interface ApiKeyProviderUsage {
  id: string
  label: string
  description: string
  website?: string
  brand_color?: string
  plan_label: string
  free_allowance_label: string
  configured: boolean
  key_hint: string | null
  used_usd: number
  tokens_used: number
  free_allowance_usd: number
  budget_usd: number
  credits_left_usd: number
  usage_percent: number
}

export interface ApiKeyUsageSummary {
  plan_label: string
  total_used_usd: number
  total_free_allowance_usd: number
  total_budget_usd: number
  total_credits_left_usd: number
  configured_count: number
  provider_count: number
}

export interface ApiKeyUsageResponse {
  providers: ApiKeyProviderUsage[]
  summary: ApiKeyUsageSummary
}
