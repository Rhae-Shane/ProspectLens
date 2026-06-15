import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import type { Session } from '@/types/report'

const statusRingClasses: Record<string, string> = {
  completed: 'text-green-600',
  running: 'text-primary',
  pending: 'text-muted-foreground',
  failed: 'text-destructive',
}

function getSessionProgress(status: string) {
  switch (status) {
    case 'completed':
      return 100
    case 'running':
      return 65
    case 'pending':
      return 15
    case 'failed':
      return 100
    default:
      return 0
  }
}

function getProgressRingClass(status: string) {
  const key = status in statusRingClasses ? status : 'pending'
  return cn(
    'grid size-3 place-items-center rounded-full p-[0.5px] bg-[conic-gradient(currentColor_0deg_var(--angle),transparent_var(--angle)_360deg)]',
    statusRingClasses[key]
  )
}

type SessionCardProps = {
  session: Session
  active?: boolean
  onSelectSession: (sessionId: string) => void
}

function SessionCard({ session, active, onSelectSession }: SessionCardProps) {
  const angle = (getSessionProgress(session.status) / 100) * 360
  const createdAt = parseISO(session.created_at)

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(event) => {
        event.currentTarget.blur()
        onSelectSession(session.id)
      }}
      className={cn(
        'flex w-full flex-col gap-4 rounded-xl border p-3 text-left transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active && 'border-primary bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-muted-foreground text-xs tabular-nums">
          {session.id.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1.5">
          <div
            style={{ '--angle': `${angle}deg` } as React.CSSProperties}
            className={getProgressRingClass(session.status)}
          >
            <div className="grid size-2 place-items-center rounded-full bg-card">
              <div className="size-1 rounded-full bg-current" />
            </div>
          </div>
          <SessionStatusBadge status={session.status} className="text-[10px]" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CompanyLogo name={session.company_name} website={session.website} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm leading-none">{session.company_name}</div>
          <div className="mt-1 truncate text-muted-foreground text-xs">{session.website}</div>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <span
          className="h-px min-w-0 border-foreground border-t border-dashed"
          style={{ flexGrow: getSessionProgress(session.status), flexBasis: 0 }}
        />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {session.workflow_status || session.status}
        </span>
        <span
          className="h-px min-w-0 border-border border-t border-dashed"
          style={{ flexGrow: 100 - getSessionProgress(session.status), flexBasis: 0 }}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-xs leading-none">Objective</div>
          <div className="mt-1 line-clamp-2 text-sm tracking-tight">{session.objective}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-muted-foreground text-xs leading-none">Created</div>
          <div className="mt-1 text-sm tabular-nums tracking-tight">{format(createdAt, 'MMM d')}</div>
          <div className="text-muted-foreground text-xs">{format(createdAt, 'h:mm a')}</div>
        </div>
      </div>
    </button>
  )
}

type SessionListProps = {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
  isLoading?: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
] as const

export function SessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  isLoading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: SessionListProps) {
  const counts = React.useMemo(
    () => ({
      all: sessions.length,
      running: sessions.filter((s) => s.status === 'running' || s.status === 'pending').length,
      completed: sessions.filter((s) => s.status === 'completed').length,
      failed: sessions.filter((s) => s.status === 'failed').length,
    }),
    [sessions]
  )

  const filteredSessions = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return sessions.filter((session) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'running'
          ? session.status === 'running' || session.status === 'pending'
          : session.status === statusFilter)

      if (!matchesStatus) return false
      if (!query) return true

      return [session.company_name, session.website, session.objective, session.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [sessions, searchQuery, statusFilter])

  return (
    <Card className="flex h-full flex-col rounded-none ring-0">
      <CardHeader>
        <CardTitle className="font-normal text-xl">Research Sessions</CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button asChild size="icon-sm" variant="ghost">
              <Link to="/sessions/new" aria-label="New research session">
                <Plus />
              </Link>
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Filter sessions">
              <SlidersHorizontal />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden px-0">
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="w-full border-b px-4" variant="line">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} className="text-xs" value={tab.value}>
                {tab.label} ({counts[tab.value]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="px-4">
          <InputGroup className="h-8">
            <InputGroupInput
              className="h-8"
              aria-label="Search sessions"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-muted-foreground text-sm">No sessions match your filters.</p>
            <Button asChild size="sm">
              <Link to="/sessions/new">
                <Plus data-icon="inline-start" />
                New Research
              </Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-0 flex-1">
            <div className="flex flex-col gap-4 px-4 pb-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  active={session.id === selectedSessionId}
                  onSelectSession={onSelectSession}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
