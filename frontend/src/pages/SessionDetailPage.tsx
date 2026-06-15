import { useCallback, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useWorkflowEvents } from '@/hooks/useWorkflowEvents'
import { WorkflowProgress } from '@/prospectlens/WorkflowProgress'
import { ReportViewer } from '@/prospectlens/ReportViewer'
import { ChatPanel } from '@/prospectlens/ChatPanel'
import { WorkflowTrace } from '@/prospectlens/WorkflowTrace'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import { CompanyIdentity } from '@/prospectlens/CompanyLogo'
import { extractResearchProviders } from '@/prospectlens/NodeOutputSummary'
import { providerColor, providerLabel } from '@/lib/source-utils'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, AlertCircle, ExternalLink, Sparkles } from 'lucide-react'
import { formatCost, cn } from '@/lib/utils'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const queryClient = useQueryClient()
  const expectRunning = Boolean(
    (location.state as { expectRunning?: boolean } | null)?.expectRunning
  )

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  })

  const streamActive =
    !!id &&
    (session?.status === 'running' ||
      session?.status === 'pending' ||
      (expectRunning && session == null))

  const handleWorkflowTerminal = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['session', id] })
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
  }, [queryClient, id])

  const { events: liveEvents } = useWorkflowEvents(id!, streamActive, handleWorkflowTerminal)

  const { data: storedEvents = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: () => api.getEvents(id!),
    enabled: !!id && !streamActive,
    staleTime: Infinity,
  })

  const allEvents = useMemo(() => {
    const source = streamActive ? liveEvents : storedEvents.length > 0 ? storedEvents : liveEvents
    return [...source].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [streamActive, liveEvents, storedEvents])

  const researchProviders = useMemo(
    () => extractResearchProviders(allEvents),
    [allEvents]
  )

  const qualityScore = useMemo(() => {
    const qc = [...allEvents]
      .reverse()
      .find((e) => e.node === 'quality_check' && e.event_type === 'completed')
    if (!qc) return null
    const data = (qc.payload.node_outputs ?? qc.payload) as Record<string, unknown>
    const score = Number(data.quality_score ?? 0)
    return score > 0 ? score : null
  }, [allEvents])

  const retryMutation = useMutation({
    mutationFn: () => api.retryWorkflow(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['events', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading session...
      </div>
    )
  }

  if (isError || !session) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{(error as Error)?.message || 'Session not found'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <CompanyIdentity
            name={session.company_name}
            website={session.website}
            size="lg"
            nameClassName="text-2xl font-bold tracking-tight"
            className="items-center"
          />
          <a
            href={session.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            {session.website} <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-muted-foreground mt-2">{session.objective}</p>
          {session.total_tokens > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {session.total_tokens.toLocaleString()} tokens · {formatCost(session.total_cost_usd)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {session.status === 'failed' && (
            <Button
              variant="outline"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
          <div className="inline-flex items-center gap-1">
            <SessionStatusBadge status={session.status} />
            {session.status === 'running' && (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            )}
          </div>
        </div>
      </div>

      {session.error_message && (
        <Alert variant="destructive">
          <AlertDescription>{session.error_message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowProgress events={allEvents} workflowStatus={session.workflow_status} />
        </CardContent>
      </Card>

      <WorkflowTrace
        events={allEvents}
        totalTokens={session.total_tokens}
        totalCost={session.total_cost_usd}
      />

      {session.report && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Research Report
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Signal-linked discovery questions, outreach playbook, and grouped evidence
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {qualityScore != null && (
                <Badge
                  variant="outline"
                  className={cn(
                    qualityScore >= 0.75
                      ? 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300'
                      : 'border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  )}
                >
                  Research quality {(qualityScore * 100).toFixed(0)}%
                </Badge>
              )}
              {researchProviders.map((provider) => (
                <Badge
                  key={provider}
                  variant="outline"
                  className={cn('text-[10px] capitalize', providerColor(provider))}
                >
                  {providerLabel(provider)}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ReportViewer report={session.report} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Follow-up Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatPanel sessionId={session.id} enabled={session.status === 'completed'} />
        </CardContent>
      </Card>
    </div>
  )
}
