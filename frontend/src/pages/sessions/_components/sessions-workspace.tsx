import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { api } from '@/api/client'
import { prefetchCompanyLogos } from '@/lib/company-logo-cache'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

import { SessionDetailsPanel } from './session-details-panel'
import { SessionList } from './session-list'

export function SessionsWorkspace() {
  const { id: routeSessionId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const expectRunning = Boolean(
    (location.state as { expectRunning?: boolean } | null)?.expectRunning
  )

  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.listSessions(1, 50),
    refetchInterval: (query) => {
      const items = query.state.data?.items
      if (!items?.some((s) => s.status === 'running' || s.status === 'pending')) {
        return false
      }
      return 30_000
    },
  })

  const sessions = data?.items ?? []

  React.useEffect(() => {
    if (sessions.length > 0) {
      prefetchCompanyLogos(sessions.map((session) => session.website))
    }
  }, [sessions])

  const selectedSessionId = React.useMemo(() => {
    if (routeSessionId && sessions.some((session) => session.id === routeSessionId)) {
      return routeSessionId
    }
    return sessions[0]?.id ?? null
  }, [routeSessionId, sessions])

  React.useEffect(() => {
    if (!routeSessionId && selectedSessionId && sessions.length > 0) {
      navigate(`/sessions/${selectedSessionId}`, { replace: true })
    }
  }, [navigate, routeSessionId, selectedSessionId, sessions.length])

  function handleSelectSession(sessionId: string) {
    navigate(`/sessions/${sessionId}`)
    if (window.innerWidth < 1024) {
      setDetailsOpen(true)
    }
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId)

  return (
    <>
      <div
        data-content-padding="false"
        className="grid h-[calc(100dvh-var(--dashboard-header-height))] overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)] lg:divide-x"
      >
        <div className="h-full overflow-hidden">
          <SessionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={handleSelectSession}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>
        <div className="hidden h-full overflow-hidden lg:block">
          <SessionDetailsPanel sessionId={selectedSessionId} expectRunning={expectRunning} />
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-3/4"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {selectedSession ? `${selectedSession.company_name} session` : 'Session details'}
            </SheetTitle>
            <SheetDescription>Research session workflow, report, and chat.</SheetDescription>
          </SheetHeader>
          <SessionDetailsPanel sessionId={selectedSessionId} expectRunning={expectRunning} />
        </SheetContent>
      </Sheet>
    </>
  )
}
