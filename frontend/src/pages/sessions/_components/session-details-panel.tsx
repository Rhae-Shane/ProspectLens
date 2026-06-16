import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Coins,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Info,
  Loader2,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { api } from '@/api/client'
import { useWorkflowEvents } from '@/hooks/useWorkflowEvents'
import { prefetchCompanyLogo } from '@/lib/company-logo-cache'
import { extractCompanyDomain } from '@/lib/company-logo'
import { providerColor, providerLabel } from '@/lib/source-utils'
import { cn, formatCost } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatPanel } from '@/prospectlens/ChatPanel'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import { extractResearchProviders } from '@/prospectlens/NodeOutputSummary'
import { ReportSectionsView } from '@/prospectlens/report-briefing/ReportSectionsView'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import { WorkflowProgress } from '@/prospectlens/WorkflowProgress'
import { WorkflowRecoveryActions } from '@/prospectlens/WorkflowRecoveryActions'
import { WorkflowTrace } from '@/prospectlens/WorkflowTrace'

import { WorkspaceEmptyState } from '@/components/workspace-empty-state'

type SessionView = 'details' | 'workflow' | 'report' | 'chat' | 'trace'

const viewItems: { id: SessionView; label: string; icon: LucideIcon; description: string }[] = [
  { id: 'details', label: 'Session Details', icon: Info, description: 'Company & objective' },
  { id: 'workflow', label: 'Workflow', icon: GitBranch, description: 'Pipeline progress' },
  { id: 'report', label: 'Research Report', icon: FileText, description: 'Generated briefing' },
  { id: 'chat', label: 'Follow-up Chat', icon: MessageSquare, description: 'Ask follow-ups' },
  { id: 'trace', label: 'Event Trace', icon: Sparkles, description: 'Token & node events' },
]

interface SessionDetailsPanelProps {
  sessionId: string | null
  expectRunning?: boolean
}

function EmptySessionDetails() {
  return <WorkspaceEmptyState icon={ClipboardList} navLabel="Select a session" />
}

function ViewNavButton({
  active,
  label,
  description,
  icon: Icon,
  disabled,
  onClick,
}: {
  active: boolean
  label: string
  description: string
  icon: LucideIcon
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'border-primary/30 bg-primary/10 shadow-sm'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      )}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-md border',
          active ? 'border-primary/20 bg-primary/15 text-primary' : 'border-border bg-muted/40 text-muted-foreground'
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm', active && 'font-medium text-primary')}>{label}</span>
        <span className="block truncate text-muted-foreground text-xs">{description}</span>
      </span>
      <ChevronRight
        className={cn(
          'size-4 shrink-0 text-muted-foreground/50 transition-transform',
          active && 'text-primary group-hover:translate-x-0.5'
        )}
      />
    </button>
  )
}

function QuickInfoChip({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  href?: string
}) {
  const content = (
    <>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
      {href ? <ExternalLink className="size-3 shrink-0 text-muted-foreground" /> : null}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs transition-colors hover:bg-muted/50"
      >
        {content}
      </a>
    )
  }

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
      {content}
    </div>
  )
}

function ViewSectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
      <div>
        <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function SessionDetailsPanel({ sessionId, expectRunning = false }: SessionDetailsPanelProps) {
  const queryClient = useQueryClient()
  const [activeView, setActiveView] = useState<SessionView>('details')

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  })

  useEffect(() => {
    setActiveView('details')
  }, [sessionId])

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

  const showRecoveryActions =
    session?.status === 'failed' || (session?.status === 'running' && !streamActive)

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

  const createdAt = parseISO(session.created_at)
  const domain = extractCompanyDomain(session.website)

  return (
    <div className="grid h-full min-h-0 overflow-hidden lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:divide-x">
      <aside className="flex min-h-0 flex-col border-b bg-muted/20 lg:border-b-0">
        <div className="shrink-0 border-b p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <CompanyLogo name={session.company_name} website={session.website} size="2xl" />
            <div className="min-w-0 w-full space-y-1">
              <h2 className="truncate font-semibold text-base leading-tight">{session.company_name}</h2>
              <p className="truncate text-muted-foreground text-xs tabular-nums">
                {domain ?? session.id.slice(0, 8)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <SessionStatusBadge status={session.status} />
              {session.workflow_status ? (
                <Badge variant="outline" className="capitalize">
                  {session.workflow_status.replace(/_/g, ' ')}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-4">
            <p className="px-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">View</p>
            <nav className="flex flex-col gap-1.5">
              {viewItems.map((item) => (
                <ViewNavButton
                  key={item.id}
                  active={activeView === item.id}
                  label={item.label}
                  description={item.description}
                  icon={item.icon}
                  disabled={item.id === 'report' && !session.report}
                  onClick={() => setActiveView(item.id)}
                />
              ))}
            </nav>
          </div>
        </ScrollArea>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <div className="shrink-0 border-b bg-muted/10 px-4 py-3 md:px-6">
          <div className="flex flex-wrap gap-2">
            <QuickInfoChip icon={Globe} label="Website" value={domain ?? session.website} href={session.website} />
            <QuickInfoChip icon={Calendar} label="Created" value={format(createdAt, 'MMM d, yyyy · h:mm a')} />
            {session.total_tokens > 0 ? (
              <QuickInfoChip
                icon={Coins}
                label="Usage"
                value={`${session.total_tokens.toLocaleString()} tokens · ${formatCost(session.total_cost_usd)}`}
              />
            ) : null}
          </div>
        </div>

        <ScrollArea className="h-full min-h-0 flex-1">
          <div className="space-y-6 p-4 md:p-6">
            {activeView === 'details' && (
              <>
                <ViewSectionHeader
                  title="Session Details"
                  description="Company context and research objective for this run."
                  action={
                    showRecoveryActions ? (
                      <WorkflowRecoveryActions
                        sessionId={session.id}
                        sessionStatus={session.status}
                        streamActive={streamActive}
                      />
                    ) : undefined
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Company
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={session.company_name} website={session.website} size="lg" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{session.company_name}</p>
                          <a
                            href={session.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-primary text-xs hover:underline"
                          >
                            {domain ?? session.website}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Session info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Session ID</span>
                        <span className="truncate font-mono text-xs">{session.id}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-right">{format(createdAt, 'PPP p')}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Status</span>
                        <SessionStatusBadge status={session.status} className="text-[10px]" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Research objective
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{session.objective}</p>
                  </CardContent>
                </Card>

                {session.error_message ? (
                  <Alert variant="destructive">
                    <AlertDescription>{session.error_message}</AlertDescription>
                  </Alert>
                ) : null}
              </>
            )}

            {activeView === 'workflow' && (
              <>
                <ViewSectionHeader
                  title="Workflow"
                  description="Live progress across research pipeline steps."
                  action={
                    showRecoveryActions ? (
                      <WorkflowRecoveryActions
                        sessionId={session.id}
                        sessionStatus={session.status}
                        streamActive={streamActive}
                      />
                    ) : undefined
                  }
                />
                <Card>
                  <CardContent className="pt-6">
                    <WorkflowProgress events={allEvents} workflowStatus={session.workflow_status} />
                  </CardContent>
                </Card>
              </>
            )}

            {activeView === 'report' && (
              <>
                <ViewSectionHeader
                  title="Research Report"
                  description="Browse each section of the company briefing."
                  action={
                    <div className="flex flex-wrap gap-2">
                      {qualityScore != null && (
                        <Badge
                          variant="outline"
                          className={cn(
                            qualityScore >= 0.75
                              ? 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300'
                              : 'border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          )}
                        >
                          Quality {(qualityScore * 100).toFixed(0)}%
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
                  }
                />
                {session.report ? (
                  <ReportSectionsView
                    report={session.report}
                    session={{
                      company_name: session.company_name,
                      website: session.website,
                      objective: session.objective,
                    }}
                  />
                ) : (
                  <div className="grid min-h-48 place-items-center rounded-xl border border-dashed text-muted-foreground text-sm">
                    Report will appear when the workflow completes.
                  </div>
                )}
              </>
            )}

            {activeView === 'chat' && (
              <>
                <ViewSectionHeader
                  title="Follow-up Chat"
                  description="Ask questions about this company briefing."
                />
                <Card>
                  <CardContent className="pt-6">
                    <ChatPanel sessionId={session.id} enabled={session.status === 'completed'} />
                  </CardContent>
                </Card>
              </>
            )}

            {activeView === 'trace' && (
              <>
                <ViewSectionHeader
                  title="Event Trace"
                  description="Token usage and node-level workflow events."
                />
                <Card>
                  <CardContent className="pt-6">
                    <WorkflowTrace
                      events={allEvents}
                      totalTokens={session.total_tokens}
                      totalCost={session.total_cost_usd}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
