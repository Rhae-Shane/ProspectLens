import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { AlertCircle, ExternalLink, FileText, Globe, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { api } from '@/api/client'
import { prefetchCompanyLogo } from '@/lib/company-logo-cache'
import { extractCompanyDomain } from '@/lib/company-logo'
import { WorkspaceEmptyState } from '@/components/workspace-empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChatPanel } from '@/prospectlens/ChatPanel'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-muted/10 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <CompanyLogo name={session.company_name} website={session.website} size="lg" />
            <div className="min-w-0 space-y-1">
              <h2 className="truncate font-semibold text-base leading-tight">{session.company_name}</h2>
              <a
                href={session.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              >
                <Globe className="size-3" />
                {domain ?? session.website}
                <ExternalLink className="size-3" />
              </a>
              <p className="text-muted-foreground text-xs">
                Generated {format(createdAt, 'MMM d, yyyy · h:mm a')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-green-200 bg-green-500/10 text-green-700 dark:text-green-300">
              Report ready
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link to={`/reports/${session.id}`}>View report</Link>
            </Button>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-muted-foreground text-sm">{session.objective}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col pt-6">
            <ChatPanel sessionId={session.id} enabled={chatEnabled} fullHeight />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
