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
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-sm">
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
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
                {status === 'running' && (
                  <Loader2 className="h-5 w-5 text-brand-600 animate-spin shrink-0" />
                )}
                {status === 'failed' && (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                {status === 'pending' && (
                  <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium truncate',
                    status === 'running' && 'text-brand-700',
                    status === 'completed' && 'text-green-700',
                    status === 'failed' && 'text-red-700',
                    status === 'pending' && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'hidden sm:block flex-1 h-0.5 mx-2',
                    status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      {workflowStatus === 'running' && (
        <p className="text-sm text-gray-500 animate-pulse">Research workflow in progress...</p>
      )}
    </div>
  )
}
