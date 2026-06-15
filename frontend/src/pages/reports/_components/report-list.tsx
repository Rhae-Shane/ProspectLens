import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { FileText, Loader2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { extractCompanyDomain } from '@/lib/company-logo'
import { cn } from '@/lib/utils'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import type { Session } from '@/types/report'

type ReportCardProps = {
  session: Session
  active?: boolean
  onSelectReport: (sessionId: string) => void
}

function ReportCard({ session, active, onSelectReport }: ReportCardProps) {
  const createdAt = parseISO(session.created_at)
  const domain = extractCompanyDomain(session.website)

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelectReport(session.id)}
      className={cn(
        'flex w-full flex-col gap-4 rounded-xl border p-4 text-left transition-all',
        'hover:border-muted-foreground/25 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        active && 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/15'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <CompanyLogo name={session.company_name} website={session.website} size="lg" />
        <FileText className="size-4 shrink-0 text-green-500" />
      </div>

      <div className="min-w-0 space-y-1">
        <p className="truncate font-semibold text-sm leading-tight">{session.company_name}</p>
        {domain ? <p className="truncate text-muted-foreground text-xs">{domain}</p> : null}
        <p className="text-muted-foreground text-xs">
          Generated {format(createdAt, 'MMM d, yyyy · h:mm a')}
        </p>
      </div>
    </button>
  )
}

type ReportListProps = {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectReport: (sessionId: string) => void
  isLoading?: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function ReportList({
  sessions,
  selectedSessionId,
  onSelectReport,
  isLoading,
  searchQuery,
  onSearchChange,
}: ReportListProps) {
  const filteredReports = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const completed = sessions.filter((session) => session.status === 'completed')

    if (!query) return completed

    return completed.filter((session) =>
      [session.company_name, session.website, session.objective]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [sessions, searchQuery])

  return (
    <Card className="flex h-full min-h-0 w-full flex-col rounded-none ring-0">
      <CardHeader className="shrink-0 space-y-1 border-b py-4">
        <CardTitle className="font-normal text-lg">Research Reports</CardTitle>
        <p className="text-muted-foreground text-xs">Sorted by: Newest first · Completed briefings</p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden px-0 pt-0">
        <div className="shrink-0 border-b px-4 py-3">
          <InputGroup>
            <InputGroupInput
              aria-label="Search reports"
              placeholder="Search reports..."
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
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-muted-foreground text-sm">No completed reports yet.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/sessions/new">Start research</Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2 p-3">
              {filteredReports.map((session) => (
                <ReportCard
                  key={session.id}
                  session={session}
                  active={session.id === selectedSessionId}
                  onSelectReport={onSelectReport}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
