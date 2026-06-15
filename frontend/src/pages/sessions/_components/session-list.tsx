import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Loader2, Plus, Search, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCost, cn } from '@/lib/utils'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import type { Session } from '@/types/report'

const statusAccentClasses: Record<string, string> = {
  completed: 'border-l-green-500/80',
  running: 'border-l-primary',
  pending: 'border-l-muted-foreground/50',
  failed: 'border-l-destructive',
}

type SessionCardProps = {
  session: Session
  active?: boolean
  onSelectSession: (sessionId: string) => void
}

function SessionCard({ session, active, onSelectSession }: SessionCardProps) {
  const createdAt = parseISO(session.created_at)
  const accent = statusAccentClasses[session.status] ?? 'border-l-border'
  const isRunning = session.status === 'running' || session.status === 'pending'

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(event) => {
        event.currentTarget.blur()
        onSelectSession(session.id)
      }}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-xl border border-l-[3px] bg-card p-3.5 text-left transition-all',
        'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        accent,
        active
          ? 'border-primary/50 bg-muted/50 shadow-sm ring-1 ring-primary/15'
          : 'border-border/80 hover:border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo name={session.company_name} website={session.website} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-sm leading-tight">{session.company_name}</h3>
              <p className="mt-1 truncate text-muted-foreground text-xs">{session.website}</p>
            </div>
            <SessionStatusBadge status={session.status} className="shrink-0 text-[10px]" />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
        <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">{session.objective}</p>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="size-3.5" />
          <span className="tabular-nums">{format(createdAt, 'MMM d, h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Loader2 className="size-3 animate-spin" />
              In progress
            </span>
          ) : session.status === 'completed' ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Sparkles className="size-3 text-green-600" />
              Briefing ready
            </span>
          ) : null}
          {session.total_tokens > 0 ? (
            <span className="text-muted-foreground tabular-nums">
              {session.total_tokens.toLocaleString()} tok · {formatCost(session.total_cost_usd)}
            </span>
          ) : null}
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
    <Card className="flex h-full min-h-0 w-full flex-col rounded-none ring-0">
      <CardHeader className="shrink-0 border-b">
        <CardTitle className="font-normal text-xl">Research Sessions</CardTitle>
        <CardAction>
          <Button asChild size="sm">
            <Link to="/sessions/new">
              <Plus data-icon="inline-start" />
              New
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-0 pt-4">
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="w-full border-b px-4" variant="line">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} className="text-xs" value={tab.value}>
                {tab.label} ({counts[tab.value]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="shrink-0 px-4">
          <InputGroup className="h-8">
            <InputGroupInput
              className="h-8"
              aria-label="Search sessions"
              placeholder="Search by company or objective..."
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
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 px-4 pb-4">
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
