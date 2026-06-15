import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { Loader2, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { extractCompanyDomain } from '@/lib/company-logo'
import { cn } from '@/lib/utils'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import type { Session } from '@/types/report'

type SessionCardProps = {
  session: Session
  active?: boolean
  onSelectSession: (sessionId: string) => void
}

function SessionCard({ session, active, onSelectSession }: SessionCardProps) {
  const createdAt = parseISO(session.created_at)
  const domain = extractCompanyDomain(session.website)

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelectSession(session.id)}
      className={cn(
        'flex w-full flex-col gap-4 rounded-xl border p-4 text-left transition-all',
        'hover:border-muted-foreground/25 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active && 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/15'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <CompanyLogo name={session.company_name} website={session.website} size="lg" />
        <SessionStatusBadge status={session.status} className="shrink-0 text-[10px]" />
      </div>

      <div className="min-w-0 space-y-1">
        <p className="truncate font-semibold text-sm leading-tight">{session.company_name}</p>
        {domain ? (
          <p className="truncate text-muted-foreground text-xs">{domain}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Created {format(createdAt, 'MMM d, yyyy · h:mm a')}
        </p>
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

const statusOptions = [
  { value: 'all', label: 'All sessions' },
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

  const statusLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? 'All sessions'

  return (
    <Card className="flex h-full min-h-0 w-full flex-col rounded-none ring-0">
      <CardHeader className="shrink-0 space-y-1 border-b py-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-normal text-lg">Sessions</CardTitle>
          <CardAction>
            <div className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost" aria-label="Filter sessions">
                    <SlidersHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuRadioGroup value={statusFilter} onValueChange={onStatusFilterChange}>
                    {statusOptions.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild size="icon-sm" variant="ghost" aria-label="New session">
                <Link to="/sessions/new">
                  <Plus />
                </Link>
              </Button>
            </div>
          </CardAction>
        </div>
        <p className="text-muted-foreground text-xs">Sorted by: Newest first · {statusLabel}</p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-0 pt-0">
        <div className="shrink-0 border-b px-4 py-3">
          <InputGroup>
            <InputGroupInput
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
            Loading...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-muted-foreground text-sm">No sessions found.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/sessions/new">
                <Plus data-icon="inline-start" />
                New Research
              </Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2 p-3">
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
