import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { api } from '@/api/client'
import { useWorkflowEvents } from '@/hooks/useWorkflowEvents'
import { prefetchCompanyLogo } from '@/lib/company-logo-cache'
import { cn, formatCost } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatPanel } from '@/prospectlens/ChatPanel'
import { CompanyIdentity } from '@/prospectlens/CompanyLogo'
import { extractResearchProviders } from '@/prospectlens/NodeOutputSummary'
import { ReportViewer } from '@/prospectlens/ReportViewer'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import { WorkflowProgress } from '@/prospectlens/WorkflowProgress'
import { WorkflowTrace } from '@/prospectlens/WorkflowTrace'
import { providerColor, providerLabel } from '@/lib/source-utils'

interface SessionDetailsPanelProps {
  sessionId: string | null
  expectRunning?: boolean
}

function EmptySessionDetails() {
  return (
    <div className="grid h-full place-items-center p-6 text-center text-muted-foreground text-sm">
      Select a research session to view workflow progress, report, and chat.
    </div>
  )
}

export function SessionDetailsPanel({ sessionId, expectRunning = false }: SessionDetailsPanelProps) {
  const queryClient = useQueryClient()

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  })

  useEffect(() => {
    if (session?.website) prefetchCompanyLogo(session.website)
  }, [session?.website])

  const streamActive =
    !!sessionId &&
    (session?.status === 'running' ||
      session?.status === 'pending' ||
      (expectRunning && session == null))

  const handleWorkflowTerminal = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
  }, [queryClient, sessionId])

  const { events: liveEvents } = useWorkflowEvents(sessionId ?? '', streamActive, handleWorkflowTerminal)

  const { data: storedEvents = [] } = useQuery({
    queryKey: ['events', sessionId],
    queryFn: () => api.getEvents(sessionId!),
    enabled: !!sessionId && !streamActive,
    staleTime: Infinity,
  })

  const allEvents = useMemo(() => {
    const source = streamActive ? liveEvents : storedEvents.length > 0 ? storedEvents : liveEvents
    return [...source].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [streamActive, liveEvents, storedEvents])

  const researchProviders = useMemo(() => extractResearchProviders(allEvents), [allEvents])

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
    mutationFn: () => api.retryWorkflow(sessionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['events', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  if (!sessionId) return <EmptySessionDetails />

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading session...
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{(error as Error)?.message || 'Session not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CompanyIdentity
              name={session.company_name}
              website={session.website}
              size="lg"
              nameClassName="text-lg font-semibold tracking-tight"
            />
            <a
              href={session.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-primary text-sm hover:underline"
            >
              {session.website}
              <ExternalLink className="size-3" />
            </a>
            <p className="mt-2 text-muted-foreground text-sm">{session.objective}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {session.status === 'failed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
              >
                <RefreshCw className={cn('size-4', retryMutation.isPending && 'animate-spin')} data-icon="inline-start" />
                Retry
              </Button>
            )}
            <SessionStatusBadge status={session.status} />
          </div>
        </div>
        {session.total_tokens > 0 && (
          <p className="mt-2 text-muted-foreground text-xs">
            {session.total_tokens.toLocaleString()} tokens · {formatCost(session.total_cost_usd)}
          </p>
        )}
      </div>

      <Tabs defaultValue="workflow" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList
          className="w-full justify-start gap-2 border-b px-4 **:data-[slot=tabs-trigger]:text-xs sm:gap-4 sm:**:data-[slot=tabs-trigger]:text-sm"
          variant="line"
        >
          <TabsTrigger className="flex-none" value="workflow">
            Workflow
          </TabsTrigger>
          <TabsTrigger className="flex-none" value="report" disabled={!session.report}>
            Report
          </TabsTrigger>
          <TabsTrigger className="flex-none" value="chat">
            Chat
          </TabsTrigger>
          <TabsTrigger className="flex-none" value="trace">
            Trace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {session.error_message && (
                <Alert variant="destructive">
                  <AlertDescription>{session.error_message}</AlertDescription>
                </Alert>
              )}
              <WorkflowProgress events={allEvents} workflowStatus={session.workflow_status} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="report" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {session.report ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Sparkles className="size-4 text-primary" />
                      Research Report
                    </div>
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
                  <ReportViewer report={session.report} />
                </>
              ) : (
                <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-muted-foreground text-sm">
                  Report will appear when the workflow completes.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="chat" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <div className="h-full p-4">
            <ChatPanel sessionId={session.id} enabled={session.status === 'completed'} />
          </div>
        </TabsContent>

        <TabsContent value="trace" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <WorkflowTrace
                events={allEvents}
                totalTokens={session.total_tokens}
                totalCost={session.total_cost_usd}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
