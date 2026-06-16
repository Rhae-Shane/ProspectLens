import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe,
  MapPin,
  Megaphone,
  MessageCircleQuestion,
  Users,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { extractCompanyDomain } from '@/lib/company-logo'
import {
  getStakeholderInitials,
  getStructuredReport,
  riskSeverityColor,
  signalTypeColor,
} from '@/lib/structured-report-utils'
import { cn } from '@/lib/utils'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import type { ReportContent } from '@/types/report'
import type { StructuredReport } from '@/types/structured-report'

import { ReportSectionsChecklist } from '@/pages/reports/_components/report-sections-checklist'
import { ResearchWorkflowBoard } from '@/pages/reports/_components/research-workflow-board'

interface ReportBriefingDashboardProps {
  report: ReportContent
  session: {
    id: string
    company_name: string
    website: string
    objective: string
    created_at: string
  }
  events?: import('@/types/report').WorkflowEvent[]
  showBackLink?: boolean
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="bg-muted/20">
      <CardContent className="space-y-1 p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-sm leading-tight">{value}</p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-md bg-primary/10 font-medium text-primary text-xs">
        {number}
      </span>
      <h2 className="font-semibold text-lg tracking-tight">{title}</h2>
    </div>
  )
}

function BriefingHeader({ structured, session }: { structured: StructuredReport; session: ReportBriefingDashboardProps['session'] }) {
  const domain = extractCompanyDomain(session.website)
  const trigger = structured.header.trigger_event

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <CompanyLogo name={session.company_name} website={session.website} size="2xl" />
          <div className="min-w-0 space-y-2">
            <div>
              <h1 className="font-semibold text-2xl tracking-tight">{session.company_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                <a
                  href={session.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="size-3.5" />
                  {domain ?? session.website}
                  <ExternalLink className="size-3" />
                </a>
                {structured.header.tagline ? (
                  <>
                    <span>·</span>
                    <span>{structured.header.tagline}</span>
                  </>
                ) : null}
                {structured.header.location ? (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {structured.header.location}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <p className="max-w-3xl text-muted-foreground text-sm">{session.objective}</p>
          </div>
        </div>
        {trigger ? (
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 px-3 py-1.5 text-xs',
              trigger.severity === 'critical'
                ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            <AlertTriangle className="mr-1 size-3.5" />
            {trigger.label}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ReportBriefingDashboard({
  report,
  session,
  events = [],
  showBackLink = true,
}: ReportBriefingDashboardProps) {
  const structured = getStructuredReport(report, session)
  const snap = structured.company_snapshot
  const commercial = structured.commercial_profile

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 md:p-6">
      {showBackLink ? (
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to={`/reports/${session.id}`}>
            <ArrowLeft data-icon="inline-start" />
            Back to report workspace
          </Link>
        </Button>
      ) : null}

      <BriefingHeader structured={structured} session={session} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeading number={1} title="Company Snapshot" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Industry" value={snap.industry} />
              <MetricCard label="Founded" value={snap.founded} />
              <MetricCard label="HQ" value={snap.hq} hint={snap.funding_round} />
              <MetricCard label="Employees" value={snap.employees} hint={snap.open_roles ? `${snap.open_roles} open roles` : undefined} />
              <MetricCard label="Status" value={snap.status} />
              <MetricCard label="Valuation" value={snap.valuation} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={2} title="Commercial Profile" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {commercial.arr ? <MetricCard label="ARR" value={commercial.arr} hint={commercial.arr_growth} /> : null}
              {commercial.developers ? <MetricCard label="Developers" value={commercial.developers} /> : null}
              {commercial.model ? <MetricCard label="Model" value={commercial.model} /> : null}
              {commercial.enterprise_min_contract ? (
                <MetricCard label="Enterprise" value={commercial.enterprise_min_contract} />
              ) : null}
              {commercial.total_raised ? <MetricCard label="Total raised" value={commercial.total_raised} /> : null}
              {commercial.cash ? <MetricCard label="Cash" value={commercial.cash} /> : null}
              {commercial.customers ? <MetricCard label="Customers" value={commercial.customers} /> : null}
              {commercial.hiring ? <MetricCard label="Hiring" value={commercial.hiring} /> : null}
              {commercial.geographic_presence ? (
                <MetricCard label="Geographic presence" value={commercial.geographic_presence} />
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={3} title="Products & Services" />
            <div className="space-y-3">
              {structured.products.map((product, index) => (
                <Card key={`${product.name}-${index}`}>
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{product.name}</p>
                        {product.tag ? <Badge variant="outline">{product.tag}</Badge> : null}
                        <Badge variant="secondary" className="text-[10px]">
                          {product.type}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={4} title="Target Customers" />
            <div className="grid gap-3 md:grid-cols-2">
              {structured.target_customers.map((customer, index) => (
                <Card key={`${customer.segment}-${index}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{customer.segment}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{customer.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={5} title="Key Stakeholders" />
            {structured.stakeholders.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {structured.stakeholders.map((person) => (
                  <Card key={person.name}>
                    <CardContent className="flex gap-3 p-4">
                      <Avatar className="size-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getStakeholderInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-2">
                        <div>
                          <p className="font-medium text-sm">{person.name}</p>
                          <p className="text-muted-foreground text-xs">{person.title}</p>
                          {person.tenure ? <p className="text-muted-foreground text-xs">{person.tenure}</p> : null}
                        </div>
                        <p className="text-sm">{person.why_matters}</p>
                        <p className="rounded-lg border bg-muted/30 p-2 text-muted-foreground text-xs italic">
                          Hook: {person.conversation_hook}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-muted-foreground text-sm">
                  <Users className="size-5" />
                  Stakeholder profiles will appear when the pipeline finds named executives in research.
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeading number={6} title="Business Signals" />
            <div className="space-y-3">
              {structured.signals.map((signal, index) => (
                <Card key={`${signal.type}-${index}`}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px]', signalTypeColor(signal.type))}>
                        {signal.type}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{signal.date}</span>
                    </div>
                    <p className="text-sm">{signal.text}</p>
                    <p className="text-muted-foreground text-xs">
                      <span className="font-medium text-foreground">Sales angle:</span> {signal.sales_angle}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={7} title="Risks & Challenges" />
            <div className="space-y-2">
              {structured.risks.map((risk, index) => (
                <div
                  key={`${risk.title}-${index}`}
                  className="flex gap-3 rounded-xl border bg-card p-4"
                >
                  <div className={cn('mt-1 w-1 shrink-0 self-stretch rounded-full', riskSeverityColor(risk.severity))} />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{risk.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {risk.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Severity {risk.severity}/5
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{risk.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={8} title="Discovery Questions" />
            <div className="space-y-3">
              {structured.discovery_questions.map((item, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="flex gap-3 p-4">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                      {index + 1}
                    </span>
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed">
                        {typeof item === 'string' ? item : item.question}
                      </p>
                      {typeof item !== 'string' && item.signal_source ? (
                        <Badge variant="outline" className="text-[10px]">
                          Source: {item.signal_source}
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={9} title="Outreach Strategy" />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="size-4" />
                  Playbook
                </CardTitle>
                <CardDescription>
                  {structured.outreach.channel}
                  {structured.outreach.primary_contact ? ` · ${structured.outreach.primary_contact}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="font-medium text-sm">Hook</p>
                  <p className="mt-1 text-sm leading-relaxed">{structured.outreach.hook}</p>
                </div>
                {structured.outreach.sequence.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {structured.outreach.sequence.map((step) => (
                      <Card key={step.day} className="bg-muted/10">
                        <CardContent className="p-3">
                          <p className="font-medium text-primary text-xs">Day {step.day}</p>
                          <p className="mt-1 text-sm">{step.action}</p>
                          {step.angle ? <p className="mt-1 text-muted-foreground text-xs">{step.angle}</p> : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <SectionHeading number={10} title="Unknowns / Gaps" />
            <div className="space-y-2">
              {structured.unknowns.map((unknown, index) => (
                <div
                  key={index}
                  className="flex gap-2 rounded-lg border border-amber-200/60 bg-amber-500/5 px-3 py-2 text-sm dark:border-amber-900/30"
                >
                  <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>{unknown}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading number={11} title="Sources" />
            <div className="flex flex-wrap gap-2">
              {structured.sources.map((source, index) => (
                <a
                  key={`${source.url}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted/50"
                >
                  {source.title}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ReportSectionsChecklist structured={structured} />
          {events.length > 0 ? <ResearchWorkflowBoard events={events} /> : null}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="size-4" />
                Research objective
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed">{session.objective}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
