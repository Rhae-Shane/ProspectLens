import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Coins,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { api } from '@/api/client'
import { prefetchCompanyLogo } from '@/lib/company-logo-cache'
import { extractCompanyDomain } from '@/lib/company-logo'
import { getStructuredReport } from '@/lib/structured-report-utils'
import { cn, formatCost } from '@/lib/utils'
import { WorkspaceEmptyState } from '@/components/workspace-empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatPanel } from '@/prospectlens/ChatPanel'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import {
  REPORT_NAV_DESCRIPTIONS,
  REPORT_NAV_ICONS,
  ReportNavContent,
  type ReportNavId,
} from '@/prospectlens/report-briefing/ReportSectionContent'
import { WorkflowProgress } from '@/prospectlens/WorkflowProgress'
import { REPORT_NAV_ITEMS } from '@/types/structured-report'

import { ResearchWorkflowBoard } from './research-workflow-board'

type ReportView = ReportNavId | 'chat' | 'workflow'

const viewItems: { id: ReportView; label: string; icon: LucideIcon; description: string }[] = [
  ...REPORT_NAV_ITEMS.map((item) => ({
    id: item.id as ReportView,
    label: item.label,
    icon: REPORT_NAV_ICONS[item.id],
    description: REPORT_NAV_DESCRIPTIONS[item.id],
  })),
  { id: 'chat', label: 'Follow-up Chat', icon: MessageSquare, description: 'Ask follow-ups' },
  { id: 'workflow', label: 'Workflow', icon: GitBranch, description: 'How it was built' },
]

interface ReportDetailsPanelProps {
  sessionId: string | null
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

function ViewSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b pb-4">
      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
      <p className="mt-1 text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

export function ReportDetailsPanel({ sessionId }: ReportDetailsPanelProps) {
  const [activeView, setActiveView] = useState<ReportView>('company_overview')

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', sessionId],
    queryFn: () => api.getEvents(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  })

  useEffect(() => {
    setActiveView('company_overview')
  }, [sessionId])

  useEffect(() => {
    if (session?.website) prefetchCompanyLogo(session.website)
  }, [session?.website])

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [events]
  )

  if (!sessionId) {
    return <WorkspaceEmptyState icon={FileText} navLabel="Select a research report" />
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading report...
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{(error as Error)?.message || 'Report not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const createdAt = parseISO(session.created_at)
  const domain = extractCompanyDomain(session.website)
  const report = session.report
  const structured = report
    ? getStructuredReport(report, {
        company_name: session.company_name,
        website: session.website,
        objective: session.objective,
      })
    : null
  const isReportNav = REPORT_NAV_ITEMS.some((item) => item.id === activeView)

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
            <Badge variant="outline" className="border-green-200 bg-green-500/10 text-green-700 dark:text-green-300">
              Report ready
            </Badge>
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
                  disabled={!report && REPORT_NAV_ITEMS.some((navItem) => navItem.id === item.id)}
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
            <QuickInfoChip icon={Calendar} label="Generated" value={format(createdAt, 'MMM d, yyyy · h:mm a')} />
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
            {isReportNav && structured && (
              <ReportNavContent
                navId={activeView as ReportNavId}
                structured={structured}
                session={{
                  company_name: session.company_name,
                  website: session.website,
                  objective: session.objective,
                  id: session.id,
                  created_at: format(createdAt, 'PPP p'),
                }}
              />
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

            {activeView === 'workflow' && (
              <>
                <ViewSectionHeader
                  title="Workflow"
                  description="How this research report was generated."
                />
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <WorkflowProgress events={sortedEvents} workflowStatus={session.workflow_status} />
                    </CardContent>
                  </Card>
                  <ResearchWorkflowBoard events={sortedEvents} />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
