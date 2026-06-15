import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Loader2, XCircle, RotateCcw } from 'lucide-react'
import type { WorkflowEvent } from '@/types/report'
import { Badge } from '@/components/ui/badge'
import { extractResearchProviders } from '@/prospectlens/NodeOutputSummary'
import { providerColor, providerLabel } from '@/lib/source-utils'

const STEPS = [
  { id: 'planner', label: 'Planner' },
  { id: 'research', label: 'Research' },
  { id: 'analyze', label: 'Analysis' },
  { id: 'quality_check', label: 'Quality Check' },
  { id: 'report_generator', label: 'Report' },
]

function getStepStatus(stepId: string, events: WorkflowEvent[]) {
  const stepEvents = events
    .filter((e) => e.node === stepId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const latest = stepEvents.at(-1)
  if (!latest) return 'pending'
  if (latest.event_type === 'failed') return 'failed'
  if (latest.event_type === 'started') return 'running'
  if (latest.event_type === 'completed') return 'completed'
  return 'pending'
}

function getResearchAttempt(events: WorkflowEvent[]) {
  const starts = events.filter((e) => e.node === 'research' && e.event_type === 'started').length
  return Math.max(1, starts)
}

function getStepMeta(stepId: string, events: WorkflowEvent[]): string | null {
  const completed = [...events]
    .reverse()
    .find((e) => e.node === stepId && e.event_type === 'completed')
  if (!completed) return null

  const data = (completed.payload.node_outputs ?? completed.payload) as Record<string, unknown>

  if (stepId === 'research') {
    const attempt = getResearchAttempt(events)
    if (data.cached) return attempt > 1 ? `cached · attempt ${attempt}` : 'cached'
    const count = data.results_count
    const countLabel = count != null ? `${count} results` : null
    if (attempt > 1) {
      return countLabel ? `${countLabel} · attempt ${attempt}` : `attempt ${attempt}`
    }
    return countLabel
  }
  if (stepId === 'quality_check' && data.quality_score != null) {
    return `${(Number(data.quality_score) * 100).toFixed(0)}%`
  }
  if (stepId === 'analyze' && data.signals_count != null) {
    return `${data.signals_count} signals`
  }
  return null
}

interface Props {
  events: WorkflowEvent[]
  workflowStatus: string
}

export function WorkflowProgress({ events, workflowStatus }: Props) {
  const retryCount = events.filter(
    (e) => e.node === 'recovery' && e.event_type === 'completed'
  ).length

  const providers = useMemo(
    () => extractResearchProviders(events.filter((e) => e.node !== 'workflow')),
    [events]
  )

  return (
    <div className="space-y-4">
      {retryCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/15 dark:text-amber-300">
          <RotateCcw className="h-4 w-4" />
          Quality check triggered {retryCount} research retr{retryCount === 1 ? 'y' : 'ies'}
        </div>
      )}

      {providers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Data sources:</span>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.id, events)
          const meta = getStepMeta(step.id, events)
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.id} className="flex items-center gap-2 sm:flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {status === 'completed' && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                )}
                {status === 'running' && (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                )}
                {status === 'failed' && (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
                {status === 'pending' && (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                )}
                <div className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-sm font-medium',
                      status === 'running' && 'text-primary',
                      status === 'completed' && 'text-green-700 dark:text-green-300',
                      status === 'failed' && 'text-destructive',
                      status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  {meta && (status === 'completed' || (status === 'running' && step.id === 'research')) && (
                    <span className="text-[10px] text-muted-foreground">{meta}</span>
                  )}
                  {status === 'running' && step.id === 'research' && getResearchAttempt(events) > 1 && !meta && (
                    <span className="text-[10px] text-muted-foreground">
                      attempt {getResearchAttempt(events)}
                    </span>
                  )}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 hidden h-0.5 flex-1 sm:block',
                    status === 'completed' ? 'bg-green-500/40' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      {workflowStatus === 'running' && (
        <p className="animate-pulse text-sm text-muted-foreground">Research workflow in progress...</p>
      )}
    </div>
  )
}
