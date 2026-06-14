import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDate, formatCost } from '@/lib/utils'
import { Plus, Loader2, AlertCircle } from 'lucide-react'

export function SessionsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.listSessions(1, 50),
    refetchInterval: 5000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Research Sessions</h1>
        <Link to="/sessions/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" /> New Session
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading sessions...
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4">
          <AlertCircle className="h-5 w-5" />
          {(error as Error).message}
        </div>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No research sessions yet.</p>
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
              <Card className="hover:border-brand-300 transition-colors">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{session.company_name}</h3>
                      <p className="text-sm text-gray-500 truncate">{session.website}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{session.objective}</p>
                    </div>
                    <div className="flex sm:flex-col items-start sm:items-end gap-1 shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : session.status === 'running'
                              ? 'bg-blue-100 text-blue-700'
                              : session.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {session.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(session.created_at)}</span>
                      {session.total_tokens > 0 && (
                        <span className="text-xs text-gray-400">
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
