import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Handshake,
  LineChart,
  Minus,
  Package,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Cell, Line, LineChart as ReLineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildBusinessSignals } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { SignalImpact, SignalPolarity, StructuredReport } from '@/types/structured-report'

const POLARITY_ICONS: Record<SignalPolarity, LucideIcon> = {
  positive: TrendingUp,
  neutral: Minus,
  risk: AlertTriangle,
}

const POLARITY_STYLES: Record<SignalPolarity, string> = {
  positive: 'text-green-600 dark:text-green-400',
  neutral: 'text-purple-600 dark:text-purple-400',
  risk: 'text-orange-600 dark:text-orange-400',
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Growth: TrendingUp,
  Market: LineChart,
  Product: Package,
  Financial: Wallet,
  Partnerships: Handshake,
}

const CATEGORY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function Sparkline({ values, color = '#22c55e' }: { values: number[]; color?: string }) {
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

function ImpactBadge({ impact }: { impact: SignalImpact }) {
  const Icon = impact === 'high' ? ArrowUpRight : impact === 'medium' ? Minus : ArrowDownRight
  const styles =
    impact === 'high'
      ? 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300'
      : impact === 'medium'
        ? 'border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300'
        : 'border-border bg-muted/40 text-muted-foreground'

  return (
    <Badge variant="outline" className={cn('gap-1 capitalize', styles)}>
      <Icon className="size-3" />
      {impact}
    </Badge>
  )
}

function StrengthGauge({ score, label }: { score: number; label: string }) {
  const rotation = Math.min(55, Math.max(-55, ((score - 50) / 50) * 55))
  return (
    <div className="space-y-3 text-center">
      <div className="relative mx-auto flex h-28 w-44 items-end justify-center">
        <div className="absolute inset-x-0 bottom-0 h-20 overflow-hidden">
          <div className="mx-auto size-40 rounded-full border-[10px] border-muted border-b-transparent border-l-green-500/30 border-r-amber-500/30 border-t-red-500/20" />
        </div>
        <div
          className="absolute bottom-2 left-1/2 h-16 w-1 origin-bottom rounded-full bg-foreground"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
      </div>
      <div>
        <p className="font-semibold text-3xl">{score}/100</p>
        <Badge variant="outline" className="mt-1 border-green-200 bg-green-500/10 text-green-700">
          {label}
        </Badge>
      </div>
    </div>
  )
}

interface BusinessSignalsDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function BusinessSignalsDashboard({
  structured,
  session,
  updatedAt,
}: BusinessSignalsDashboardProps) {
  const overview = buildBusinessSignals(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)
  const [activeCategory, setActiveCategory] = useState('All Signals')

  const categoryTabs = useMemo(() => {
    const tabs = ['All Signals']
    for (const category of overview.categories) {
      tabs.push(`${category.name} (${category.count})`)
    }
    return tabs
  }, [overview.categories])

  const filteredSignals = useMemo(() => {
    if (activeCategory === 'All Signals') return overview.key_signals
    const categoryName = activeCategory.replace(/\s+\(\d+\)$/, '')
    return overview.key_signals.filter((signal) => signal.category === categoryName)
  }, [activeCategory, overview.key_signals])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Business Signals</h1>
          <p className="text-muted-foreground text-sm">
            Growth, market, and product signals for {session.company_name}
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signal Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.summary_counts.map((item) => {
              const Icon = POLARITY_ICONS[item.polarity]
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
                  <span className={cn('grid size-9 place-items-center rounded-lg bg-muted/40', POLARITY_STYLES[item.polarity])}>
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-muted-foreground text-xs">{item.label}</p>
                    <p className="font-semibold text-xl">{item.value}</p>
                    <p className="text-muted-foreground text-xs">{item.hint}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Signal Strength</CardTitle>
          </CardHeader>
          <CardContent>
            <StrengthGauge score={overview.overall_strength.score} label={overview.overall_strength.label} />
            <p className="mt-2 text-center text-green-600 text-sm dark:text-green-400">
              {overview.overall_strength.change_label} ↑ {overview.overall_strength.change}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signal Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ score: { label: 'Strength', color: 'var(--chart-1)' } }} className="h-40 w-full">
              <ReLineChart data={overview.signal_trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </ReLineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Business Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="h-auto flex-wrap justify-start gap-1">
                {categoryTabs.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="text-xs">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="space-y-3">
              {filteredSignals.map((signal) => {
                const Icon = CATEGORY_ICONS[signal.category] ?? Sparkles
                const sparkColor =
                  signal.polarity === 'positive'
                    ? '#22c55e'
                    : signal.polarity === 'risk'
                      ? '#f97316'
                      : '#8b5cf6'
                return (
                  <div key={`${signal.title}-${signal.category}`} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm">{signal.title}</p>
                            <Badge variant="outline">{signal.category}</Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{signal.description}</p>
                        </div>
                      </div>
                      <ImpactBadge impact={signal.impact} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <p className="text-muted-foreground text-xs">
                        <span className="font-medium text-foreground">Indicator:</span> {signal.indicator}
                      </p>
                      <Sparkline values={signal.trend} color={sparkColor} />
                    </div>
                  </div>
                )
              })}
            </div>

            <button type="button" className="text-primary text-sm hover:underline">
              View all signals ({overview.key_signals.length}) →
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signals by Category</CardTitle>
          </CardHeader>
          <CardContent className="grid items-center gap-4">
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
                  <span className="font-medium tabular-nums">{category.percent}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Business Developments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.recent_developments.map((item) => (
              <div key={`${item.title}-${item.date}`} className="relative border-l-2 pl-4">
                <span className="absolute top-1 -left-[5px] size-2 rounded-full bg-primary" />
                <p className="text-muted-foreground text-xs">{item.date}</p>
                <p className="mt-1 font-medium text-sm">{item.title}</p>
                <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{item.description}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {item.category}
                </Badge>
              </div>
            ))}
            <button type="button" className="text-primary text-xs hover:underline">
              View all developments →
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Positive Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.top_positive_signals.map((signal) => (
              <div key={signal.title} className="rounded-lg border bg-green-500/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{signal.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">{signal.metric}</p>
                  </div>
                  <Badge variant="outline" className="border-green-200 bg-green-500/10 text-green-700 text-[10px]">
                    High Impact
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Risk Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.key_risk_signals.map((signal) => (
              <div key={signal.title} className="rounded-lg border bg-orange-500/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{signal.title}</p>
                    <p className="mt-1 text-muted-foreground text-xs">{signal.metric}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      signal.impact === 'high'
                        ? 'border-red-200 bg-red-500/10 text-red-700'
                        : 'border-orange-200 bg-orange-500/10 text-orange-700'
                    )}
                  >
                    {signal.impact === 'high' ? 'High Impact' : 'Medium Impact'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
