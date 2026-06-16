import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, RefreshCw } from 'lucide-react'

import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface WorkflowRecoveryActionsProps {
  sessionId: string
  sessionStatus: string
  streamActive?: boolean
  className?: string
}

export function WorkflowRecoveryActions({
  sessionId,
  sessionStatus,
  streamActive = false,
  className,
}: WorkflowRecoveryActionsProps) {
  const queryClient = useQueryClient()

  const checkpointEnabled =
    !streamActive && (sessionStatus === 'failed' || sessionStatus === 'running')

  const { data: checkpoint } = useQuery({
    queryKey: ['workflow-checkpoint', sessionId],
    queryFn: () => api.getWorkflowCheckpoint(sessionId),
    enabled: checkpointEnabled,
    staleTime: 10_000,
  })

  const invalidateWorkflow = () => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['events', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['workflow-checkpoint', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
  }

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeWorkflow(sessionId),
    onSuccess: invalidateWorkflow,
  })

  const retryMutation = useMutation({
    mutationFn: () => api.retryWorkflow(sessionId),
    onSuccess: invalidateWorkflow,
  })

  const canResume = Boolean(checkpoint?.can_resume)
  const showRetry = sessionStatus === 'failed'
  const showResume = canResume && !streamActive

  if (!showResume && !showRetry) return null

  const busy = resumeMutation.isPending || retryMutation.isPending

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {showResume ? (
        <Button size="sm" onClick={() => resumeMutation.mutate()} disabled={busy}>
          <Play className={cn('size-4', resumeMutation.isPending && 'animate-pulse')} data-icon="inline-start" />
          Resume workflow
        </Button>
      ) : null}
      {showRetry ? (
        <Button
          variant={showResume ? 'outline' : 'default'}
          size="sm"
          onClick={() => retryMutation.mutate()}
          disabled={busy}
        >
          <RefreshCw
            className={cn('size-4', retryMutation.isPending && 'animate-spin')}
            data-icon="inline-start"
          />
          {showResume ? 'Restart from scratch' : 'Retry workflow'}
        </Button>
      ) : null}
    </div>
  )
}
