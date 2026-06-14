import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useWorkflowEvents } from '@/hooks/useWorkflowEvents'
import { WorkflowProgress } from '@/components/WorkflowProgress'
import { ReportViewer } from '@/components/ReportViewer'
import { ChatPanel } from '@/components/ChatPanel'
import { WorkflowTrace } from '@/components/WorkflowTrace'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { formatCost } from '@/lib/utils'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'running' ? 3000 : false
    },
  })

  const isRunning = session?.status === 'running'
  const { events: sseEvents } = useWorkflowEvents(id!, isRunning || session?.status === 'pending')

  const { data: storedEvents = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: () => api.getEvents(id!),
    enabled: !!id && !isRunning,
  })

  const events = sseEvents.length > 0 ? sseEvents : storedEvents

  const retryMutation = useMutation({
    mutationFn: () => api.retryWorkflow(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading session...
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4">
        <AlertCircle className="h-5 w-5" />
        {(error as Error)?.message || 'Session not found'}
      </div>
    )
  }

  const allEvents = events.length > 0 ? events : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{session.company_name}</h1>
          <a
            href={session.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            {session.website} <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-gray-600 mt-2">{session.objective}</p>
          {session.total_tokens > 0 && (
            <p className="text-xs text-gray-400 mt-1">
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
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              session.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : session.status === 'running'
                  ? 'bg-blue-100 text-blue-700'
                  : session.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
            }`}
          >
            {session.status === 'running' && (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            )}
            {session.status}
          </span>
        </div>
      </div>

      {session.error_message && (
        <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
          {session.error_message}
        </div>
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
          <CardHeader>
            <CardTitle>Research Report</CardTitle>
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
