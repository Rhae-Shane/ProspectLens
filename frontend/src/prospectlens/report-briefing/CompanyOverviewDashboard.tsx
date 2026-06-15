import {
  ArrowUpRight,
  Briefcase,
  Building2,
  DollarSign,
  ExternalLink,
  Globe,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { buildCompanyOverview } from '@/lib/structured-report-utils'
import { formatDisplayTimestamp } from '@/lib/utils'
import { CompanyLogo } from '@/prospectlens/CompanyLogo'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { StructuredReport } from '@/types/structured-report'

const METRIC_ICONS: LucideIcon[] = [DollarSign, Users, TrendingUp, Briefcase, Globe, ShieldCheck]

function Sparkline({ values, color = '#22c55e' }: { values: number[]; color?: string }) {
  if (!values.length) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 80 - 10
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  )
}

function SnapshotRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

interface CompanyOverviewDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
  onViewFullReport?: () => void
}

export function CompanyOverviewDashboard({
  structured,
  session,
  updatedAt,
  onViewFullReport,
}: CompanyOverviewDashboardProps) {
  const overview = buildCompanyOverview(structured)
  const snap = structured.company_snapshot
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Company Overview</h1>
          <p className="text-muted-foreground text-sm">
            Key information and business snapshot of {session.company_name}.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2">
            {onViewFullReport ? (
              <Button variant="outline" size="sm" onClick={onViewFullReport}>
                View Full Report
              </Button>
            ) : null}
            <Button size="sm">Export PDF</Button>
          </div>
          <p className="text-muted-foreground text-xs">Last updated: {formattedDate}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Company Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <CompanyLogo name={session.company_name} website={session.website} size="xl" />
              <div className="min-w-0 space-y-2">
                <div>
                  <h2 className="font-semibold text-lg">{session.company_name}</h2>
                  <Badge variant="secondary" className="mt-1">
                    {snap.industry}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{overview.description}</p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/10 px-4">
              <SnapshotRow label="Founded" value={snap.founded} />
              <SnapshotRow label="Headquarters" value={snap.hq} />
              <SnapshotRow label="Employees" value={snap.employees} />
              <SnapshotRow label="CEO" value={snap.ceo} />
              <SnapshotRow label="Company Type" value={snap.company_type ?? snap.status} />
              <SnapshotRow label="Latest Funding" value={snap.latest_funding ?? snap.funding_round} />
              <SnapshotRow label="Valuation" value={snap.valuation} />
              <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Website</span>
                <a
                  href={session.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  {snap.website ?? session.website}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {overview.key_metrics.map((metric, index) => {
                const Icon = METRIC_ICONS[index] ?? TrendingUp
                return (
                  <div key={metric.label} className="rounded-lg border bg-muted/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Icon className="size-4" />
                      <span className="text-xs">{metric.label}</span>
                    </div>
                    <p className="font-semibold text-lg">{metric.value}</p>
                    {metric.change ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-green-600 text-xs dark:text-green-400">
                        <ArrowUpRight className="size-3" />
                        {metric.change}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-muted-foreground text-xs">
              * Sources: Company reports, press releases, LinkedIn, and public data.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Commercial Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {overview.commercial_trends.map((trend, index) => (
                <div key={trend.label} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{trend.label}</p>
                    <span className="text-green-600 text-xs dark:text-green-400">{trend.change}</span>
                  </div>
                  <p className="mb-2 font-semibold text-sm">{trend.value}</p>
                  <Sparkline
                    values={trend.trend}
                    color={index % 2 === 0 ? '#22c55e' : index === 2 ? '#a855f7' : '#3b82f6'}
                  />
                </div>
              ))}
            </div>
            {overview.commercial_summary ? (
              <p className="text-muted-foreground text-sm leading-relaxed">{overview.commercial_summary}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Market Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.market_share ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{overview.market_share.label}</span>
                  <span className="font-medium">{overview.market_share.value}</span>
                </div>
                <Progress value={overview.market_share.percent} className="h-2" />
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="font-medium text-sm">Top Competitors</p>
              <div className="flex flex-wrap gap-2">
                {overview.competitors.map((competitor) => (
                  <Badge key={competitor} variant="outline" className="px-3 py-1.5">
                    {competitor}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Industry Standing</p>
              <ul className="space-y-1.5">
                {overview.industry_standing.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Growth Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.growth_signals.map((signal) => (
              <div key={signal.title} className="flex gap-3 rounded-lg border bg-muted/10 p-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-sm">{signal.title}</p>
                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{signal.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent News</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recent_news.map((item) => (
              <div key={`${item.title}-${item.date}`} className="space-y-1 border-b pb-3 last:border-b-0">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:text-primary hover:underline"
                  >
                    {item.title}
                  </a>
                ) : (
                  <p className="font-medium text-sm">{item.title}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {item.source} · {item.date}
                </p>
              </div>
            ))}
            <button type="button" className="text-primary text-xs hover:underline">
              View all news →
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Strengths & Potential Challenges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 font-medium text-green-700 text-sm dark:text-green-400">Key Strengths</p>
              <div className="flex flex-wrap gap-2">
                {overview.strengths.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-green-200 bg-green-500/10 text-green-700 dark:text-green-300"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium text-orange-700 text-sm dark:text-orange-400">Potential Challenges</p>
              <div className="flex flex-wrap gap-2">
                {overview.challenges.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="border-orange-200 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
