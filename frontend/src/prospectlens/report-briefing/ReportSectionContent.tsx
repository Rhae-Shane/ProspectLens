import {
  AlertTriangle,
  Building2,
  ExternalLink,
  HelpCircle,
  Link2,
  Megaphone,
  MessageCircleQuestion,
  Package,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getStakeholderInitials,
  riskSeverityColor,
  signalTypeColor,
} from '@/lib/structured-report-utils'
import { cn } from '@/lib/utils'
import {
  REPORT_NAV_ITEMS,
  REPORT_SECTIONS,
  type ReportNavId,
  type ReportSectionId,
  type StructuredReport,
} from '@/types/structured-report'
import { BusinessSignalsDashboard } from '@/prospectlens/report-briefing/BusinessSignalsDashboard'
import { CompanyOverviewDashboard } from '@/prospectlens/report-briefing/CompanyOverviewDashboard'
import { DiscoveryQuestionsDashboard } from '@/prospectlens/report-briefing/DiscoveryQuestionsDashboard'
import { OutreachStrategiesDashboard } from '@/prospectlens/report-briefing/OutreachStrategiesDashboard'
import { ProductsServicesDashboard } from '@/prospectlens/report-briefing/ProductsServicesDashboard'
import { SourcesDashboard } from '@/prospectlens/report-briefing/SourcesDashboard'
import { UnknownsDashboard } from '@/prospectlens/report-briefing/UnknownsDashboard'
import { RisksChallengesDashboard } from '@/prospectlens/report-briefing/RisksChallengesDashboard'
import { StakeholdersDashboard } from '@/prospectlens/report-briefing/StakeholdersDashboard'
import { TargetCustomersDashboard } from '@/prospectlens/report-briefing/TargetCustomersDashboard'

export type { ReportSectionId, ReportNavId }

export const REPORT_NAV_ICONS: Record<ReportNavId, LucideIcon> = {
  company_overview: Building2,
  products: Package,
  customers: Users,
  stakeholders: UserRound,
  signals: TrendingUp,
  risks: AlertTriangle,
  discovery: MessageCircleQuestion,
  outreach: Megaphone,
  unknowns: HelpCircle,
  sources: Link2,
}

export const REPORT_NAV_DESCRIPTIONS: Record<ReportNavId, string> = {
  company_overview: 'Snapshot, metrics & market position',
  products: 'Offerings & positioning',
  customers: 'Segments, industries & geographies',
  stakeholders: 'Executives, board & partners',
  signals: 'Dated business events',
  risks: 'Severity-ranked risks',
  discovery: 'Prioritized meeting questions',
  outreach: 'Strategies, channels & personas',
  unknowns: 'Gaps, impact & resolution plan',
  sources: 'Cited references & reliability',
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

interface ReportSectionContentProps {
  sectionId: ReportSectionId
  structured: StructuredReport
  headingNumber?: number
  headingTitle?: string
}

export function ReportSectionContent({
  sectionId,
  structured,
  headingNumber,
  headingTitle,
}: ReportSectionContentProps) {
  const meta = REPORT_SECTIONS.find((section) => section.id === sectionId)
  const snap = structured.company_snapshot
  const commercial = structured.commercial_profile

  if (!meta) return null

  return (
    <div className="space-y-4">
      <SectionHeading number={headingNumber ?? meta.number} title={headingTitle ?? meta.label} />

      {sectionId === 'snapshot' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Industry" value={snap.industry} />
          <MetricCard label="Founded" value={snap.founded} />
          <MetricCard label="HQ" value={snap.hq} hint={snap.funding_round} />
          <MetricCard
            label="Employees"
            value={snap.employees}
            hint={snap.open_roles ? `${snap.open_roles} open roles` : undefined}
          />
          <MetricCard label="Status" value={snap.status} />
          <MetricCard label="Valuation" value={snap.valuation} />
        </div>
      )}

      {sectionId === 'commercial' && (
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
      )}

      {sectionId === 'products' && (
        <div className="space-y-3">
          {structured.products.map((product, index) => (
            <Card key={`${product.name}-${index}`}>
              <CardContent className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">{product.name}</p>
                  {product.tag ? <Badge variant="outline">{product.tag}</Badge> : null}
                  <Badge variant="secondary" className="text-[10px]">
                    {product.type}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sectionId === 'customers' && (
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
      )}

      {sectionId === 'stakeholders' &&
        (structured.stakeholders.length > 0 ? (
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
            <CardContent className="p-6 text-muted-foreground text-sm">
              No named stakeholders found in this research run yet.
            </CardContent>
          </Card>
        ))}

      {sectionId === 'signals' && (
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
      )}

      {sectionId === 'risks' && (
        <div className="space-y-2">
          {structured.risks.map((risk, index) => (
            <div key={`${risk.title}-${index}`} className="flex gap-3 rounded-xl border bg-card p-4">
              <div className={cn('mt-1 w-1 shrink-0 self-stretch rounded-full', riskSeverityColor(risk.severity))} />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">{risk.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {risk.category}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{risk.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {sectionId === 'discovery' && (
        <div className="space-y-3">
          {structured.discovery_questions.map((item, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardContent className="flex gap-3 p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                  {index + 1}
                </span>
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed">{typeof item === 'string' ? item : item.question}</p>
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
      )}

      {sectionId === 'outreach' && (
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
              <div className="grid gap-2 sm:grid-cols-2">
                {structured.outreach.sequence.map((step) => (
                  <Card key={step.day} className="bg-muted/10">
                    <CardContent className="p-3">
                      <p className="font-medium text-primary text-xs">Day {step.day}</p>
                      <p className="mt-1 text-sm">{step.action}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {sectionId === 'unknowns' && (
        <div className="space-y-2">
          {structured.unknowns.map((unknown, index) => (
            <div
              key={index}
              className="flex gap-2 rounded-lg border border-amber-200/60 bg-amber-500/5 px-3 py-2 text-sm dark:border-amber-900/30"
            >
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>{unknown}</span>
            </div>
          ))}
        </div>
      )}

      {sectionId === 'sources' && (
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
      )}
    </div>
  )
}

export interface ReportSessionMeta {
  company_name: string
  website: string
  objective: string
  id?: string
  created_at?: string
}

interface ReportNavContentProps {
  navId: ReportNavId | ReportSectionId
  structured: StructuredReport
  session?: ReportSessionMeta
}

export function ReportNavContent({ navId, structured, session }: ReportNavContentProps) {
  const navMeta = REPORT_NAV_ITEMS.find((item) => item.id === navId)

  if (navId === 'company_overview' && session) {
    return (
      <CompanyOverviewDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'products' && session) {
    return (
      <ProductsServicesDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'customers' && session) {
    return (
      <TargetCustomersDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'risks' && session) {
    return (
      <RisksChallengesDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'signals' && session) {
    return (
      <BusinessSignalsDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'stakeholders' && session) {
    return (
      <StakeholdersDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'discovery' && session) {
    return (
      <DiscoveryQuestionsDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'outreach' && session) {
    return (
      <OutreachStrategiesDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'unknowns' && session) {
    return (
      <UnknownsDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  if (navId === 'sources' && session) {
    return (
      <SourcesDashboard
        structured={structured}
        session={session}
        updatedAt={session.created_at}
      />
    )
  }

  const sectionMeta = REPORT_SECTIONS.find((section) => section.id === navId)
  const headingNumber = navMeta?.number ?? sectionMeta?.number
  const headingTitle = navMeta?.label ?? sectionMeta?.label

  return (
    <ReportSectionContent
      sectionId={navId as ReportSectionId}
      structured={structured}
      headingNumber={headingNumber}
      headingTitle={headingTitle}
    />
  )
}
