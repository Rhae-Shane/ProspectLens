import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  Info,
  ShieldAlert,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildRisksChallenges } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { RiskLevel, StructuredReport } from '@/types/structured-report'

const SUMMARY_ICONS: Record<RiskLevel, LucideIcon> = {
  high: ShieldAlert,
  medium: AlertTriangle,
  low: Info,
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
}

const LEVEL_TEXT: Record<RiskLevel, string> = {
  high: 'text-red-600 dark:text-red-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-blue-600 dark:text-blue-400',
}

const MITIGATION_STYLES: Record<string, string> = {
  'In Progress': 'border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Monitoring: 'border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Mitigated: 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300',
  'Not Started': 'border-border bg-muted/40 text-muted-foreground',
}

const CATEGORY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function Sparkline({ values, color = '#ef4444' }: { values: number[]; color?: string }) {
  if (!values.length) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 70 - 15
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" className="h-8 w-20" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  )
}

function LevelDots({ level }: { level: RiskLevel }) {
  return (
    <span className="inline-flex items-center gap-1">
      {(['low', 'medium', 'high'] as RiskLevel[]).map((item) => (
        <span
          key={item}
          className={cn(
            'size-2 rounded-full',
            item === level ? LEVEL_COLORS[level] : 'bg-muted'
          )}
        />
      ))}
    </span>
  )
}

function RiskGauge({ level }: { level: RiskLevel }) {
  const rotation = level === 'high' ? 55 : level === 'medium' ? 0 : -55
  return (
    <div className="relative mx-auto flex h-28 w-44 items-end justify-center">
      <div className="absolute inset-x-0 bottom-0 h-20 overflow-hidden">
        <div className="mx-auto size-40 rounded-full border-[10px] border-muted border-b-transparent border-l-red-500/30 border-r-amber-500/30 border-t-green-500/30" />
      </div>
      <div
        className="absolute bottom-2 left-1/2 h-16 w-1 origin-bottom rounded-full bg-foreground transition-transform"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      />
      <Badge
        variant="outline"
        className={cn(
          'relative z-10 capitalize',
          level === 'high' && 'border-red-200 bg-red-500/10 text-red-700',
          level === 'medium' && 'border-amber-200 bg-amber-500/10 text-amber-700',
          level === 'low' && 'border-green-200 bg-green-500/10 text-green-700'
        )}
      >
        {level}
      </Badge>
    </div>
  )
}

function heatCellColor(impact: RiskLevel, likelihood: RiskLevel, count: number): string {
  if (count === 0) return 'bg-muted/30'
  const score =
    (impact === 'high' ? 3 : impact === 'medium' ? 2 : 1) *
    (likelihood === 'high' ? 3 : likelihood === 'medium' ? 2 : 1)
  if (score >= 6) return 'bg-red-600/80 text-white'
  if (score >= 4) return 'bg-red-400/70 text-white'
  if (score >= 3) return 'bg-amber-400/70 text-foreground'
  if (score >= 2) return 'bg-amber-200/80 text-foreground'
  return 'bg-green-200/80 text-foreground'
}

interface RisksChallengesDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function RisksChallengesDashboard({
  structured,
  session,
  updatedAt,
}: RisksChallengesDashboardProps) {
  const overview = buildRisksChallenges(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)
  const [insightTab, setInsightTab] = useState<RiskLevel>('high')

  const trendChartData = overview.risk_trend.map((point) => ({
    month: point.month,
    score: point.score,
  }))

  const categoryChartData = overview.categories.map((category, index) => ({
    name: category.name,
    value: category.count,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }))

  const chartConfig = overview.categories.reduce<ChartConfig>((config, category, index) => {
    config[category.name] = {
      label: category.name,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }
    return config
  }, {})

  const filteredInsights = useMemo(
    () => overview.detailed_insights.filter((item) => item.level === insightTab),
    [overview.detailed_insights, insightTab]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Risks & Challenges</h1>
          <p className="text-muted-foreground text-sm">
            Key risks and challenges that could impact {session.company_name}&apos;s business, growth, and operations
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.summary_counts.map((item) => {
          const Icon = SUMMARY_ICONS[item.level] ?? CircleAlert
          return (
            <Card key={item.label}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className={cn('grid size-10 place-items-center rounded-lg bg-muted/50', LEVEL_TEXT[item.level])}>
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                  <p className="font-semibold text-2xl">{item.value}</p>
                  <p className="text-muted-foreground text-xs">{item.hint}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Risk Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <RiskGauge level={overview.overall_risk_level} />
            <Badge variant="outline" className="capitalize">
              {overview.overall_status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ score: { label: 'Risk', color: 'var(--chart-1)' } }} className="h-40 w-full">
              <LineChart data={trendChartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis hide domain={[1, 3]} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Risks & Challenges</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs">
                <th className="pb-3 pr-4 font-medium">Risk / Challenge</th>
                <th className="pb-3 pr-4 font-medium">Category</th>
                <th className="pb-3 pr-4 font-medium">Impact</th>
                <th className="pb-3 pr-4 font-medium">Likelihood</th>
                <th className="pb-3 pr-4 font-medium">Trend</th>
                <th className="pb-3 font-medium">Mitigation Status</th>
              </tr>
            </thead>
            <tbody>
              {overview.top_risks.map((risk) => (
                <tr key={risk.title} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium">{risk.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{risk.description}</p>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <Badge variant="outline">{risk.category}</Badge>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <LevelDots level={risk.impact} />
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <LevelDots level={risk.likelihood} />
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <Sparkline values={risk.trend} />
                  </td>
                  <td className="py-3 align-top">
                    <Badge
                      variant="outline"
                      className={cn('gap-1', MITIGATION_STYLES[risk.mitigation_status] ?? MITIGATION_STYLES.Monitoring)}
                    >
                      {risk.mitigation_status}
                      <ChevronDown className="size-3" />
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risks by Category</CardTitle>
          </CardHeader>
          <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-44">
              <PieChart>
                <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
                  {categoryChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-2">
              {overview.categories.map((category, index) => (
                <li key={category.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    />
                    {category.name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {category.count} ({category.percent}%)
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk Heat Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1 text-center text-muted-foreground text-xs">
                <div />
                <div>Low</div>
                <div>Medium</div>
                <div>High</div>
              </div>
              {(['high', 'medium', 'low'] as RiskLevel[]).map((impact) => (
                <div key={impact} className="grid grid-cols-4 gap-1">
                  <div className="flex items-center justify-end pr-2 text-muted-foreground text-xs capitalize">
                    {impact}
                  </div>
                  {(['low', 'medium', 'high'] as RiskLevel[]).map((likelihood) => {
                    const cell = overview.heat_map.find(
                      (item) => item.impact === impact && item.likelihood === likelihood
                    )
                    const count = cell?.count ?? 0
                    return (
                      <div
                        key={`${impact}-${likelihood}`}
                        className={cn(
                          'grid h-14 place-items-center rounded-md font-medium text-sm',
                          heatCellColor(impact, likelihood, count)
                        )}
                      >
                        {count}
                      </div>
                    )
                  })}
                </div>
              ))}
              <p className="pt-1 text-center text-muted-foreground text-xs">Likelihood →</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detailed Risk Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={insightTab} onValueChange={(value) => setInsightTab(value as RiskLevel)}>
              <TabsList className="mb-4">
                <TabsTrigger value="high">High Risks</TabsTrigger>
                <TabsTrigger value="medium">Medium Risks</TabsTrigger>
                <TabsTrigger value="low">Low Risks</TabsTrigger>
              </TabsList>
              <TabsContent value={insightTab} className="space-y-3">
                {filteredInsights.length ? (
                  filteredInsights.map((insight) => (
                    <div key={insight.title} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <Badge variant="outline" className={cn('capitalize', LEVEL_TEXT[insight.potential_impact])}>
                          {insight.potential_impact}
                        </Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{insight.description}</p>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <p>
                          <span className="text-muted-foreground">Potential Impact:</span>{' '}
                          <span className="font-medium capitalize">{insight.potential_impact}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Time Horizon:</span>{' '}
                          <span className="font-medium">{insight.time_horizon}</span>
                        </p>
                      </div>
                      <p className="mt-2 text-sm">
                        <span className="font-medium">Mitigation:</span> {insight.mitigation}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No {insightTab} risks identified in this report.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Challenges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.key_challenges.map((challenge) => (
              <div key={challenge} className="flex gap-3 rounded-lg border bg-muted/10 p-3">
                <Target className="mt-0.5 size-4 shrink-0 text-purple-600" />
                <p className="text-sm leading-relaxed">{challenge}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
