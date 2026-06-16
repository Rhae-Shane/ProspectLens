import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { AlertCircle, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { api } from '@/api/client'
import { prefetchCompanyLogo } from '@/lib/company-logo-cache'
import { extractCompanyDomain } from '@/lib/company-logo'
import { WorkspaceEmptyState } from '@/components/workspace-empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'

import { FollowUpChatInterface } from './follow-up-chat-interface'

interface ReportChatPanelProps {
  sessionId: string | null
}

export function ReportChatPanel({ sessionId }: ReportChatPanelProps) {
  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    enabled: !!sessionId,
  })

  useEffect(() => {
    if (session?.website) prefetchCompanyLogo(session.website)
  }, [session?.website])

  if (!sessionId) {
    return (
      <WorkspaceEmptyState
        icon={FileText}
        navLabel="Select a report"
        contentLabel="Choose a completed research report to start follow-up chat."
      />
    )
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
  const chatEnabled = session.status === 'completed' && Boolean(session.report)

  if (!chatEnabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CompanyLogo name={session.company_name} website={session.website} size="xl" />
        <p className="font-medium">{session.company_name}</p>
        <p className="max-w-sm text-muted-foreground text-sm">
          Complete the research workflow before chatting about this report.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={`/sessions/${session.id}`}>View session</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo name={session.company_name} website={session.website} size="sm" />
          <div className="min-w-0">
            <h2 className="truncate font-medium text-sm">{session.company_name}</h2>
            <p className="truncate text-muted-foreground text-xs">
              {domain} · {format(createdAt, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="shrink-0 text-xs">
          <Link to={`/reports/${session.id}`} className="gap-1.5">
            View report
            <ExternalLink className="size-3" />
          </Link>
        </Button>
      </header>

      <FollowUpChatInterface
        sessionId={session.id}
        companyName={session.company_name}
        className="min-h-0 flex-1"
      />
    </div>
  )
}
