import {
  AlertTriangle,
  BookOpen,
  Clock,
  FlaskConical,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  Radar,
  Search,
  Target,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Cell, Pie, PieChart } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { buildUnknownsOverview } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { UnknownImpact, StructuredReport } from '@/types/structured-report'

const SUMMARY_ICONS: LucideIcon[] = [HelpCircle, AlertTriangle, Clock, Info]

const IMPACT_COLORS: Record<UnknownImpact, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

const IMPACT_BADGE_STYLES: Record<UnknownImpact, string> = {
  high: 'border-red-200 bg-red-500/10 text-red-700 dark:text-red-300',
  medium: 'border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300',
}

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Strategy: 'border-purple-200 bg-purple-500/10 text-purple-700',
  Market: 'border-blue-200 bg-blue-500/10 text-blue-700',
  Product: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
  Financial: 'border-amber-200 bg-amber-500/10 text-amber-700',
  Operations: 'border-orange-200 bg-orange-500/10 text-orange-700',
  Partnerships: 'border-cyan-200 bg-cyan-500/10 text-cyan-700',
}

const CATEGORY_BAR_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-cyan-500',
]

const HORIZON_COLORS = ['var(--chart-1)', 'var(--chart-4)', 'var(--chart-2)']

const DEFAULT_LEARNING_OBJECTIVES = [
  {
    title: 'Validate Assumptions',
    description: 'Test key assumptions about market, customers, and strategic priorities.',
    icon: Target,
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Reduce Uncertainty',
    description: 'Fill critical information gaps to improve confidence in decision-making.',
    icon: Search,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    title: 'Identify Opportunities',
    description: 'Uncover hidden opportunities that could drive differentiation and growth.',
    icon: Radar,
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    title: 'Mitigate Risk',
    description: 'Surface early warning signals and potential blind spots.',
    icon: AlertTriangle,
    color: 'bg-blue-500/10 text-blue-600',
  },
] as const

const DEFAULT_RESOLUTION_STRATEGIES = [
  {
    title: 'Stakeholder Outreach',
    description: 'Engage with internal and external stakeholders to close information gaps.',
    icon: Users,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: 'Market & Industry Research',
    description: 'Monitor industry trends, competitor moves, and regulatory changes.',
    icon: BookOpen,
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Customer & Partner Interviews',
    description: 'Talk to merchants, partners, and developers to validate assumptions.',
    icon: MessageSquare,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    title: 'Pilot & Experimentation',
    description: 'Run tests and experiments to validate hypotheses before committing.',
    icon: FlaskConical,
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    title: 'Continuous Monitoring',
    description: 'Track changes in regulations, technology, and market dynamics.',
    icon: Radar,
    color: 'bg-cyan-500/10 text-cyan-600',
  },
] as const

function SectionEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="border border-dashed py-8">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ImpactBadge({ impact }: { impact: UnknownImpact }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 text-[10px] capitalize', IMPACT_BADGE_STYLES[impact])}>
      <span
        className={cn(
          'size-1.5 rounded-full',
          impact === 'high' && 'bg-red-500',
          impact === 'medium' && 'bg-amber-500',
          impact === 'low' && 'bg-green-500'
        )}
      />
      {impact}
    </Badge>
  )
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px]', CATEGORY_BADGE_STYLES[category] ?? 'bg-muted/40')}
    >
      {category}
    </Badge>
  )
}

function ImpactMeter({ impact }: { impact: UnknownImpact }) {
  const filled = impact === 'high' ? 5 : impact === 'medium' ? 3 : 1
  const color =
    impact === 'high' ? 'bg-red-500' : impact === 'medium' ? 'bg-amber-500' : 'bg-green-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn('size-2 rounded-full', index < filled ? color : 'bg-muted')}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs capitalize">{impact}</span>
    </div>
  )
}

interface UnknownsDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function UnknownsDashboard({ structured, session, updatedAt }: UnknownsDashboardProps) {
  const overview = buildUnknownsOverview(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)

  const impactChartData = overview.impact_mix.map((item) => ({
    name: item.name,
    value: item.count,
    fill: IMPACT_COLORS[item.impact],
  }))

  const impactChartConfig = overview.impact_mix.reduce<ChartConfig>((config, item) => {
    config[item.name] = {
      label: item.name,
      color: IMPACT_COLORS[item.impact],
    }
    return config
  }, {})

  const horizonChartData = overview.time_horizon_mix.map((item, index) => ({
    name: item.name,
    value: item.count,
    fill: HORIZON_COLORS[index % HORIZON_COLORS.length],
  }))

  const horizonChartConfig = overview.time_horizon_mix.reduce<ChartConfig>((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: HORIZON_COLORS[index % HORIZON_COLORS.length],
    }
    return config
  }, {})

  const highImpactItems = overview.unknown_items.filter((item) => item.impact === 'high')
  const totalUnknowns = overview.summary_counts[0]?.value ?? overview.unknown_items.length

  const learningObjectives =
    overview.learning_objectives && overview.learning_objectives.length > 0
      ? overview.learning_objectives.map((item, index) => ({
          ...item,
          icon: DEFAULT_LEARNING_OBJECTIVES[index % DEFAULT_LEARNING_OBJECTIVES.length].icon,
          color: DEFAULT_LEARNING_OBJECTIVES[index % DEFAULT_LEARNING_OBJECTIVES.length].color,
        }))
      : DEFAULT_LEARNING_OBJECTIVES

  const resolutionStrategies =
    overview.resolution_strategies && overview.resolution_strategies.length > 0
      ? overview.resolution_strategies.map((item, index) => ({
          ...item,
          icon: DEFAULT_RESOLUTION_STRATEGIES[index % DEFAULT_RESOLUTION_STRATEGIES.length].icon,
          color: DEFAULT_RESOLUTION_STRATEGIES[index % DEFAULT_RESOLUTION_STRATEGIES.length].color,
        }))
      : DEFAULT_RESOLUTION_STRATEGIES

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Unknowns</h1>
          <p className="text-muted-foreground text-sm">
            Key unknowns and information gaps that could impact {session.company_name}&apos;s future
            strategy and decision-making
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              View Full Report
            </Button>
            <Button size="sm">Export PDF</Button>
          </div>
          <p className="text-muted-foreground text-xs">Last updated: {formattedDate}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unknowns Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.summary_counts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.summary_counts.map((item, index) => {
                  const Icon = SUMMARY_ICONS[index] ?? HelpCircle
                  return (
                    <div key={item.label} className="rounded-lg border bg-muted/10 p-3">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" />
                        <span className="text-xs">{item.label}</span>
                      </div>
                      <p className="font-semibold text-2xl">{item.value}</p>
                      <p className="text-muted-foreground text-xs">{item.hint}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <SectionEmpty
                title="No unknowns metrics yet"
                description="Re-run research to identify information gaps."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Impact Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.impact_mix.length > 0 && totalUnknowns > 0 ? (
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                <div className="relative">
                  <ChartContainer config={impactChartConfig} className="mx-auto aspect-square h-40">
                    <PieChart>
                      <Pie
                        data={impactChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={72}
                      >
                        {impactChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-semibold text-2xl">{totalUnknowns}</p>
                    <p className="text-muted-foreground text-xs">Total</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {overview.impact_mix.map((item) => (
                    <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: IMPACT_COLORS[item.impact] }}
                        />
                        {item.name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {item.percent}% ({item.count})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SectionEmpty
                title="No impact distribution"
                description="Impact breakdown appears when unknowns are identified."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unknowns by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.categories.length > 0 ? (
              overview.categories.map((category, index) => (
                <div key={category.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{category.name}</span>
                    <span className="font-medium tabular-nums">
                      {category.count} ({category.percent}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length]
                      )}
                      style={{ width: `${Math.min(category.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <SectionEmpty
                title="No category breakdown"
                description="Categories are computed from identified unknowns."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Unknowns</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {overview.unknown_items.length > 0 ? (
              <>
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-3 pr-4 font-medium">Unknown</th>
                      <th className="pb-3 pr-4 font-medium">Category</th>
                      <th className="pb-3 pr-4 font-medium">Impact</th>
                      <th className="pb-3 pr-4 font-medium">Why It Matters</th>
                      <th className="pb-3 font-medium">Potential Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.unknown_items.slice(0, 12).map((item, index) => (
                      <tr key={`${item.unknown}-${index}`} className="border-b align-top last:border-b-0">
                        <td className="max-w-xs py-4 pr-4 font-medium leading-relaxed">
                          {item.unknown}
                        </td>
                        <td className="py-4 pr-4">
                          <CategoryBadge category={item.category} />
                        </td>
                        <td className="py-4 pr-4">
                          <ImpactBadge impact={item.impact} />
                        </td>
                        <td className="max-w-xs py-4 pr-4 text-muted-foreground text-xs leading-relaxed">
                          {item.why_it_matters}
                        </td>
                        <td className="py-4">
                          <ImpactMeter impact={item.potential_impact} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="mt-3 text-primary text-sm hover:underline">
                  View all {overview.unknown_items.length} unknowns →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No unknowns identified"
                description="Information gaps are surfaced from QC coverage and research limitations."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <MapPin className="size-4 text-red-500" />
            <CardTitle className="text-base">Top High Impact Unknowns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {highImpactItems.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {highImpactItems.slice(0, 6).map((item, index) => (
                    <li key={`${item.unknown}-${index}`} className="flex gap-3 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="leading-relaxed">{item.unknown}</p>
                        <ImpactBadge impact="high" />
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" className="text-primary text-xs hover:underline">
                  View all high impact unknowns →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No high impact unknowns"
                description="Critical gaps appear when research has significant blind spots."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unknowns by Time Horizon</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.time_horizon_mix.length > 0 ? (
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                <ChartContainer config={horizonChartConfig} className="mx-auto aspect-square h-36">
                  <PieChart>
                    <Pie
                      data={horizonChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={62}
                    >
                      {horizonChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="space-y-2">
                  {overview.time_horizon_mix.map((item, index) => (
                    <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: HORIZON_COLORS[index % HORIZON_COLORS.length] }}
                        />
                        {item.name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {item.percent}% ({item.count})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SectionEmpty
                title="No time horizon data"
                description="Time horizons are assigned when unknowns are generated."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What We Need to Learn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {learningObjectives.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-3 rounded-lg border bg-muted/10 p-3">
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', item.color)}>
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How We&apos;ll Resolve These Unknowns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolutionStrategies.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-3 rounded-lg border bg-muted/10 p-3">
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', item.color)}>
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
