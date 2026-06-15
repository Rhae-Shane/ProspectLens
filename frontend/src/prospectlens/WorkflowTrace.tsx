import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Activity } from 'lucide-react'
import type { WorkflowEvent } from '@/types/report'
import { formatCost, formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { extractResearchProviders, NodeOutputSummary } from '@/prospectlens/NodeOutputSummary'
import { providerColor, providerLabel } from '@/lib/source-utils'

interface Props {
  events: WorkflowEvent[]
  totalTokens: number
  totalCost: number
}

const eventStyles = {
  completed: 'border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300',
  failed: 'border-red-200 bg-red-500/10 text-red-700 dark:border-red-900/40 dark:bg-red-500/15 dark:text-red-300',
  started: 'border-blue-200 bg-blue-500/10 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/15 dark:text-blue-300',
  default: 'border-border bg-muted text-muted-foreground',
} as const

export function WorkflowTrace({ events, totalTokens, totalCost }: Props) {
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const nodeEvents = events.filter((e) => e.node !== 'workflow')

  const providers = useMemo(() => extractResearchProviders(nodeEvents), [nodeEvents])

  const latestQuality = useMemo(() => {
    const qc = [...nodeEvents]
      .reverse()
      .find((e) => e.node === 'quality_check' && e.event_type === 'completed')
    if (!qc) return null
    const data = (qc.payload.node_outputs ?? qc.payload) as Record<string, unknown>
    return Number(data.quality_score ?? 0)
  }, [nodeEvents])

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-muted/50 px-4 py-3 transition-colors hover:bg-muted"
      >
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Activity className="h-4 w-4" />
            Workflow Trace
            <span className="font-normal text-muted-foreground">
              ({nodeEvents.length} events · {totalTokens.toLocaleString()} tokens · {formatCost(totalCost)})
            </span>
          </div>
          {providers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {providers.map((provider) => (
                <Badge
                  key={provider}
                  variant="outline"
                  className={cn('text-[10px] capitalize', providerColor(provider))}
                >
                  {providerLabel(provider)}
                </Badge>
              ))}
            </div>
          )}
          {latestQuality != null && latestQuality > 0 && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                latestQuality >= 0.75
                  ? 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300'
                  : 'border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              )}
            >
              QC {(latestQuality * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
          {nodeEvents.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">No events yet.</p>
          )}
          {nodeEvents.map((event) => {
            const styleKey =
              event.event_type in eventStyles
                ? (event.event_type as keyof typeof eventStyles)
                : 'default'
            const isExpanded = expandedId === event.id
            const hasPayload =
              event.event_type === 'completed' &&
              event.payload &&
              Object.keys(event.payload).length > 0

            return (
              <div key={event.id} className="px-4 py-2 text-sm">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => hasPayload && setExpandedId(isExpanded ? null : event.id)}
                  disabled={!hasPayload}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">
                      {event.node.replace(/_/g, ' ')}
                      <Badge
                        variant="outline"
                        className={cn('ml-2 rounded text-xs capitalize', eventStyles[styleKey])}
                      >
                        {event.event_type}
                      </Badge>
                      {hasPayload && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
                    {event.duration_ms > 0 && <span>{event.duration_ms}ms</span>}
                    {event.tokens > 0 && <span>{event.tokens} tokens</span>}
                    {event.cost_usd > 0 && <span>{formatCost(event.cost_usd)}</span>}
                  </div>
                </button>
                {isExpanded && hasPayload && (
                  <NodeOutputSummary node={event.node} payload={event.payload} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
