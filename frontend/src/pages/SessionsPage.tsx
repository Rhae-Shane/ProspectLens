import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDate, formatCost } from '@/lib/utils'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'
import { Plus, Loader2, AlertCircle } from 'lucide-react'

export function SessionsPage() {
  const { data, isLoading, isError, error } = useQuery({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Research Sessions</h1>
        <Link to="/sessions/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" /> New Session
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading sessions...
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No research sessions yet.</p>
            <Link to="/sessions/new">
              <Button>Create Your First Session</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className="grid gap-3">
          {data.items.map((session) => (
            <Link key={session.id} to={`/sessions/${session.id}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{session.company_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{session.website}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{session.objective}</p>
                    </div>
                    <div className="flex sm:flex-col items-start sm:items-end gap-1 shrink-0">
                      <SessionStatusBadge status={session.status} />
                      <span className="text-xs text-muted-foreground">{formatDate(session.created_at)}</span>
                      {session.total_tokens > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {session.total_tokens.toLocaleString()} tokens · {formatCost(session.total_cost_usd)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
