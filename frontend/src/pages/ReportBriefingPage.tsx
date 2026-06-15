import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { ReportWorkspace } from '@/prospectlens/report-briefing/ReportWorkspace'

export function ReportBriefingPage() {
  const { id } = useParams<{ id: string }>()

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: () => api.getEvents(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading briefing...
      </div>
    )
  }

  if (isError || !session?.report) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm">Report not available for this session.</p>
        <Button asChild variant="outline">
          <Link to="/reports">Back to reports</Link>
        </Button>
      </div>
    )
  }

  return (
    <div data-content-padding="false" className="flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden">
      <ReportWorkspace
        report={session.report}
        session={{
          id: session.id,
          company_name: session.company_name,
          website: session.website,
          objective: session.objective,
          created_at: session.created_at,
        }}
        events={events}
      />
    </div>
  )
}
