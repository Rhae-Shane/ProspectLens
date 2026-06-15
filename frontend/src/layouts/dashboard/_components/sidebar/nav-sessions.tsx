import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Plus, Search } from 'lucide-react'

import { api } from '@/api/client'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NavSessions() {
  const location = useLocation()
  const onSessionsRoute = location.pathname.startsWith('/sessions')

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'nav'],
    queryFn: () => api.listSessions(1, 5),
    refetchInterval: (query) => {
      const items = query.state.data?.items
      if (!items?.some((s) => s.status === 'running' || s.status === 'pending')) {
        return false
      }
      return 30_000
    },
  })

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <Button
        variant={onSessionsRoute ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8"
        asChild
      >
        <Link to="/sessions">
          <Search className="size-4" />
          Sessions
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            Recent
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Research Sessions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              Loading…
            </DropdownMenuItem>
          )}
          {!isLoading && data?.items.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No sessions yet
            </DropdownMenuItem>
          )}
          {data?.items.map((session) => (
            <DropdownMenuItem key={session.id} asChild>
              <Link to={`/sessions/${session.id}`} className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{session.company_name}</span>
                <SessionStatusBadge status={session.status} className="text-[10px]" />
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/sessions/new" className="gap-2">
              <Plus className="size-4" />
              New research session
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/sessions">View all sessions</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
