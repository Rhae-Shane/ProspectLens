import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { prefetchCompanyLogos } from '@/lib/company-logo-cache'
import { CompanyIdentity } from '@/prospectlens/CompanyLogo'
import { SessionStatusBadge } from '@/prospectlens/SessionStatusBadge'

export function HomePage() {
  const { data } = useQuery({
    queryKey: ['sessions', 1],
    queryFn: () => api.listSessions(1, 5),
  })

  useEffect(() => {
    if (data?.items.length) {
      prefetchCompanyLogos(data.items.map((session) => session.website))
    }
  }, [data?.items])

  return (
    <div className="space-y-10">
      <section className="text-center py-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
          <Search className="h-4 w-4" />
          AI Research Copilot
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
          Your sellers run the conversation.
          <br />
          <span className="text-primary">We do everything else.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
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
          <h2 className="text-xl font-semibold tracking-tight mb-4">Recent Sessions</h2>
          <div className="grid gap-3">
            {data.items.map((session) => (
              <Link key={session.id} to={`/sessions/${session.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <CompanyIdentity
                        name={session.company_name}
                        website={session.website}
                      />
                      <p className="mt-2 truncate text-sm text-muted-foreground">{session.objective}</p>
                    </div>
                    <div className="text-right text-sm">
                      <SessionStatusBadge status={session.status} />
                      <p className="text-muted-foreground mt-1">{formatDate(session.created_at)}</p>
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
