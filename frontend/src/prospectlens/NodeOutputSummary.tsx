import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { providerColor, providerLabel } from '@/lib/source-utils'

interface Props {
  node: string
  payload: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function asNumberRecord(value: unknown): Record<string, number> {
  const record = asRecord(value)
  if (!record) return {}
  return Object.fromEntries(
    Object.entries(record).map(([key, val]) => [key, Number(val) || 0])
  )
}

function CoverageBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.75
      ? 'bg-green-500'
      : score >= 0.6
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function NodeOutputSummary({ node, payload }: Props) {
  const data = asRecord(payload.node_outputs) ?? payload

  if (node === 'research') {
    const providers = asStringArray(data.providers)
    const searchConfig = asRecord(data.search_config)
    const intelFlags = searchConfig
      ? [
          searchConfig.intel_reddit_search && 'Reddit',
          searchConfig.intel_g2_search && 'G2',
          searchConfig.intel_hiring_search && 'Hiring',
          searchConfig.intel_sentiment_search && 'Sentiment',
        ].filter(Boolean)
      : []

    return (
      <div className="mt-2 space-y-2 rounded-lg border border-border bg-background/80 p-3 text-xs">
        {data.cached ? (
          <p className="text-muted-foreground">Used cached research ({String(data.count ?? 0)} items)</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {providers.length > 0 ? (
                providers.map((provider) => (
                  <Badge
                    key={provider}
                    variant="outline"
                    className={cn('text-[10px] capitalize', providerColor(provider))}
                  >
                    {providerLabel(provider)}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">No providers recorded</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {data.queries_run != null && <span>{String(data.queries_run)} planner queries</span>}
              {data.intel_queries_run != null && Number(data.intel_queries_run) > 0 && (
                <span>{String(data.intel_queries_run)} intel searches</span>
              )}
              {data.results_count != null && <span>{String(data.results_count)} total results</span>}
            </div>
            {intelFlags.length > 0 && (
              <p className="text-muted-foreground">
                Intel: {intelFlags.join(' · ')}
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  if (node === 'quality_check') {
    const coverage = asNumberRecord(data.section_coverage)
    const unknowns = asStringArray(data.suggested_unknowns)
    const issues = asStringArray(data.quality_issues)
    const score = Number(data.quality_score ?? 0)

    return (
      <div className="mt-2 space-y-3 rounded-lg border border-border bg-background/80 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Quality score</span>
          <Badge
            variant="outline"
            className={cn(
              score >= 0.75
                ? 'border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:text-green-300'
                : score >= 0.6
                  ? 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-900/40 dark:text-amber-300'
                  : 'border-red-200 bg-red-500/10 text-red-700 dark:border-red-900/40 dark:text-red-300'
            )}
          >
            {(score * 100).toFixed(0)}%
          </Badge>
        </div>
        {Object.keys(coverage).length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(coverage).map(([section, sectionScore]) => (
              <CoverageBar key={section} label={section} score={sectionScore} />
            ))}
          </div>
        )}
        {unknowns.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-amber-700 dark:text-amber-300">Suggested unknowns</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {unknowns.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {issues.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-foreground">Issues</p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              {issues.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (node === 'analyze') {
    return (
      <div className="mt-2 rounded-lg border border-border bg-background/80 p-3 text-xs text-muted-foreground">
        Extracted {String(data.signals_count ?? 0)} business signals with typed categories
      </div>
    )
  }

  if (node === 'planner') {
    const focusAreas = asStringArray(data.focus_areas)
    const queries = asStringArray(data.queries)
    const searchConfig = asRecord(data.search_config)

    return (
      <div className="mt-2 space-y-2 rounded-lg border border-border bg-background/80 p-3 text-xs">
        {focusAreas.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-foreground">Focus areas</p>
            <div className="flex flex-wrap gap-1">
              {focusAreas.map((area) => (
                <Badge key={area} variant="secondary" className="text-[10px]">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {queries.length > 0 && (
          <p className="text-muted-foreground">{queries.length} research queries planned</p>
        )}
        {searchConfig && (
          <p className="text-muted-foreground">
            Tavily depth: {String(searchConfig.tavily_search_depth ?? 'basic')}
            {searchConfig.producthunt_use_lookup ? ' · Product Hunt on' : ''}
          </p>
        )}
      </div>
    )
  }

  if (node === 'recovery') {
    const additional = asStringArray(data.additional_queries)
    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:text-amber-200">
        Added {additional.length} recovery {additional.length === 1 ? 'query' : 'queries'} after quality gaps
      </div>
    )
  }

  if (node === 'report_generator') {
    const sections = asStringArray(data.sections)
    const merged = Number(data.qc_unknowns_merged ?? 0)
    return (
      <div className="mt-2 rounded-lg border border-border bg-background/80 p-3 text-xs text-muted-foreground">
        Generated {sections.length} report sections
        {merged > 0 && ` · merged ${merged} QC unknowns`}
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="mt-2 rounded-lg border border-red-200 bg-red-500/10 p-3 text-xs text-red-700 dark:border-red-900/40 dark:text-red-300">
        {String(data.error)}
      </div>
    )
  }

  const keys = Object.keys(data).filter((k) => k !== 'node_outputs')
  if (keys.length === 0) return null

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/80 p-3 text-xs text-muted-foreground">
      {keys.slice(0, 4).map((key) => (
        <div key={key}>
          <span className="font-medium text-foreground">{key}: </span>
          {typeof data[key] === 'object' ? JSON.stringify(data[key]).slice(0, 120) : String(data[key])}
        </div>
      ))}
    </div>
  )
}

export function extractResearchProviders(events: { node: string; event_type: string; payload: Record<string, unknown> }[]): string[] {
  const researchEvent = [...events]
    .reverse()
    .find((e) => e.node === 'research' && e.event_type === 'completed')

  if (!researchEvent) return []

  const data = asRecord(researchEvent.payload.node_outputs) ?? researchEvent.payload
  return asStringArray(data.providers)
}
