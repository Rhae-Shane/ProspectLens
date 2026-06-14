import { Link } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'

export function HomePage() {
  const { data } = useQuery({
    queryKey: ['sessions', 1],
    queryFn: () => api.listSessions(1, 5),
  })

  return (
    <div className="space-y-10">
      <section className="text-center py-12">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
          <Search className="h-4 w-4" />
          AI Research Copilot
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Your sellers run the conversation.
          <br />
          <span className="text-brand-600">We do everything else.</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          ProspectLens researches companies, generates structured meeting briefings, and
          powers follow-up chat — powered by LangGraph multi-step AI workflows.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/sessions/new">
            <Button size="lg">
              Start Research <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/sessions">
            <Button variant="outline" size="lg">
              View Sessions
            </Button>
          </Link>
        </div>
      </section>

      {data && data.items.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
          <div className="grid gap-3">
            {data.items.map((session) => (
              <Link key={session.id} to={`/sessions/${session.id}`}>
                <Card className="hover:border-brand-300 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{session.company_name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-md">
                        {session.objective}
                      </p>
                    </div>
                    <div className="text-right text-sm">
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
                      <p className="text-gray-400 mt-1">{formatDate(session.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
