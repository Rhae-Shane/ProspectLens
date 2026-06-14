import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Loader2, XCircle, RotateCcw } from 'lucide-react'
import type { WorkflowEvent } from '@/types/report'

const STEPS = [
  { id: 'planner', label: 'Planner' },
  { id: 'research', label: 'Research' },
  { id: 'analyze', label: 'Analysis' },
  { id: 'quality_check', label: 'Quality Check' },
  { id: 'report_generator', label: 'Report' },
]

function getStepStatus(stepId: string, events: WorkflowEvent[]) {
  const stepEvents = events.filter((e) => e.node === stepId)
  if (stepEvents.some((e) => e.event_type === 'failed')) return 'failed'
  if (stepEvents.some((e) => e.event_type === 'completed')) return 'completed'
  if (stepEvents.some((e) => e.event_type === 'started')) return 'running'
  return 'pending'
}

interface Props {
  events: WorkflowEvent[]
  workflowStatus: string
}

export function WorkflowProgress({ events, workflowStatus }: Props) {
  const retryCount = events.filter(
    (e) => e.node === 'recovery' && e.event_type === 'completed'
  ).length

  return (
    <div className="space-y-4">
      {retryCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/15 dark:text-amber-300">
          <RotateCcw className="h-4 w-4" />
          Quality check triggered {retryCount} research retry{retryCount > 1 ? 'ies' : ''}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
        {STEPS.map((step, i) => {
          const status = getStepStatus(step.id, events)
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.id} className="flex items-center gap-2 sm:flex-1">
              <div className="flex items-center gap-2 min-w-0">
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
                <span
                  className={cn(
                    'truncate text-sm font-medium',
                    status === 'running' && 'text-primary',
                    status === 'completed' && 'text-green-700 dark:text-green-300',
                    status === 'failed' && 'text-destructive',
                    status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
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
