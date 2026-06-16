import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { api } from '@/api/client'
import { prefetchCompanyLogos } from '@/lib/company-logo-cache'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ReportList } from '@/pages/reports/_components/report-list'

import { ReportChatPanel } from './report-chat-panel'

export function ReportChatWorkspace() {
  const { id: routeSessionId } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [chatOpen, setChatOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'follow-up-chat'],
    queryFn: () => api.listSessions(1, 100),
  })

  const sessions = data?.items ?? []

  React.useEffect(() => {
    if (sessions.length > 0) {
      prefetchCompanyLogos(sessions.map((session) => session.website))
    }
  }, [sessions])

  const selectedSessionId = React.useMemo(() => {
    if (!routeSessionId) return null
    if (sessions.some((session) => session.id === routeSessionId && session.status === 'completed')) {
      return routeSessionId
    }
    return null
  }, [routeSessionId, sessions])

  function handleSelectReport(sessionId: string) {
    navigate(`/follow-up-chat/${sessionId}`)
    if (window.innerWidth < 1024) {
      setChatOpen(true)
    }
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId)

  return (
    <>
      <div
        data-content-padding="false"
        className="grid min-h-0 w-full max-w-none flex-1 overflow-hidden lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:divide-x"
      >
        <div className="h-full overflow-hidden">
          <ReportList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectReport={handleSelectReport}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            title="Follow-up Chat"
            subtitle="Select a completed report to ask questions"
            searchPlaceholder="Search reports to chat..."
            emptyMessage="No completed reports available for chat."
          />
        </div>
        <div className="hidden h-full overflow-hidden lg:block">
          <ReportChatPanel sessionId={selectedSessionId} />
        </div>
      </div>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-3/4"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {selectedSession ? `Chat about ${selectedSession.company_name}` : 'Follow-up chat'}
            </SheetTitle>
            <SheetDescription>Ask questions about the selected research report.</SheetDescription>
          </SheetHeader>
          <ReportChatPanel sessionId={selectedSessionId} />
        </SheetContent>
      </Sheet>
    </>
  )
}
