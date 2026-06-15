import { useMemo, useState } from 'react'
import {
  Clock,
  HelpCircle,
  Lightbulb,
  Shield,
  Star,
  Target,
  ThumbsUp,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildDiscoveryQuestionsOverview } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type {
  DiscoveryImpact,
  DiscoveryPriority,
  DiscoveryQuestionItem,
  StructuredReport,
} from '@/types/structured-report'

const SUMMARY_ICONS: LucideIcon[] = [HelpCircle, Target, Clock, ThumbsUp]

const PRIORITY_COLORS: Record<DiscoveryPriority, string> = {
  high: 'var(--chart-1)',
  medium: 'var(--chart-4)',
  low: 'var(--chart-2)',
}

const PRIORITY_BADGE_STYLES: Record<DiscoveryPriority, string> = {
  high: 'border-red-200 bg-red-500/10 text-red-700 dark:text-red-300',
  medium: 'border-orange-200 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  low: 'border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300',
}

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Strategy: 'border-purple-200 bg-purple-500/10 text-purple-700',
  Product: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
  Market: 'border-blue-200 bg-blue-500/10 text-blue-700',
  Operations: 'border-orange-200 bg-orange-500/10 text-orange-700',
  Financial: 'border-amber-200 bg-amber-500/10 text-amber-700',
  Partnerships: 'border-cyan-200 bg-cyan-500/10 text-cyan-700',
}

const CATEGORY_BAR_COLORS = [
  'bg-purple-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-cyan-500',
]

const VALUE_DRIVERS = [
  {
    title: 'Uncover Opportunities',
    description: 'Identify unmet needs and growth areas we can help address.',
    icon: Lightbulb,
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Validate Fit',
    description: 'Confirm alignment between our solution and their priorities.',
    icon: Target,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    title: 'Build Relationships',
    description: 'Engage in meaningful conversations with key stakeholders.',
    icon: Users,
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    title: 'Reduce Risk',
    description: 'Make informed decisions with deeper context and insights.',
    icon: Shield,
    color: 'bg-blue-500/10 text-blue-600',
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

function PriorityBadge({ priority }: { priority: DiscoveryPriority }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 text-[10px]', PRIORITY_BADGE_STYLES[priority])}>
      <span className={cn('size-1.5 rounded-full', priority === 'high' && 'bg-red-500', priority === 'medium' && 'bg-orange-500', priority === 'low' && 'bg-blue-500')} />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  )
}

function ImpactMeter({ impact }: { impact: DiscoveryImpact }) {
  const filled = impact === 'high' ? 5 : impact === 'medium' ? 3 : 2
  const color =
    impact === 'high'
      ? 'bg-emerald-500'
      : impact === 'medium'
        ? 'bg-orange-500'
        : 'bg-blue-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn('h-2 w-3 rounded-sm', index < filled ? color : 'bg-muted')}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs capitalize">{impact}</span>
    </div>
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

interface DiscoveryQuestionsDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function DiscoveryQuestionsDashboard({
  structured,
  session,
  updatedAt,
}: DiscoveryQuestionsDashboardProps) {
  const overview = buildDiscoveryQuestionsOverview(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)
  const [activeCategory, setActiveCategory] = useState('All')

  const categoryTabs = useMemo(() => {
    const tabs = [{ name: 'All', count: overview.questions.length }]
    for (const category of overview.categories) {
      tabs.push({ name: category.name, count: category.count })
    }
    return tabs
  }, [overview.categories, overview.questions.length])

  const filteredQuestions = useMemo(() => {
    if (activeCategory === 'All') return overview.questions
    return overview.questions.filter((question) => question.category === activeCategory)
  }, [activeCategory, overview.questions])

  const highPriorityQuestions = overview.questions.filter((q) => q.priority === 'high')

  const priorityChartData = overview.priority_mix.map((item) => ({
    name: item.name,
    value: item.count,
    fill: PRIORITY_COLORS[item.priority],
  }))

  const priorityChartConfig = overview.priority_mix.reduce<ChartConfig>((config, item) => {
    config[item.name] = {
      label: item.name,
      color: PRIORITY_COLORS[item.priority],
    }
    return config
  }, {})

  const totalQuestions = overview.summary_counts[0]?.value ?? overview.questions.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Discovery Questions</h1>
          <p className="text-muted-foreground text-sm">
            Key questions to explore further with {session.company_name} to uncover deeper insights
            and validate opportunities
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Discovery Overview</CardTitle>
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
                title="No discovery metrics yet"
                description="Re-run research to generate discovery question metrics."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Questions by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.priority_mix.length > 0 && totalQuestions > 0 ? (
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                <div className="relative">
                  <ChartContainer config={priorityChartConfig} className="mx-auto aspect-square h-44">
                    <PieChart>
                      <Pie
                        data={priorityChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={75}
                      >
                        {priorityChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-semibold text-2xl">{totalQuestions}</p>
                    <p className="text-muted-foreground text-xs">Total</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {overview.priority_mix.map((item) => (
                    <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
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
                title="No priority breakdown"
                description="Priority distribution appears when discovery questions are generated."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Discovery Questions by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.questions.length > 0 ? (
              <>
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                  <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                    {categoryTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.name}
                        value={tab.name}
                        className="rounded-full border px-3 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {tab.name} ({tab.count})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-3 pr-4 font-medium">Question</th>
                        <th className="pb-3 pr-4 font-medium">Category</th>
                        <th className="pb-3 pr-4 font-medium">Priority</th>
                        <th className="pb-3 pr-4 font-medium">Rationale</th>
                        <th className="pb-3 font-medium">Potential Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.slice(0, 12).map((item: DiscoveryQuestionItem, index) => (
                        <tr key={`${item.question}-${index}`} className="border-b align-top last:border-b-0">
                          <td className="max-w-xs py-4 pr-4 font-medium leading-relaxed">
                            {item.question}
                          </td>
                          <td className="py-4 pr-4">
                            <CategoryBadge category={item.category} />
                          </td>
                          <td className="py-4 pr-4">
                            <PriorityBadge priority={item.priority} />
                          </td>
                          <td className="max-w-xs py-4 pr-4 text-muted-foreground text-xs leading-relaxed">
                            {item.rationale}
                          </td>
                          <td className="py-4">
                            <ImpactMeter impact={item.potential_impact} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="text-primary text-sm hover:underline">
                  View all {overview.questions.length} questions →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No discovery questions yet"
                description="Questions are generated from signals, risks, and stakeholder research."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Star className="size-4 text-red-500" />
              <CardTitle className="text-base">Top Priority Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highPriorityQuestions.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {highPriorityQuestions.slice(0, 6).map((item, index) => (
                      <li key={`${item.question}-${index}`} className="space-y-1.5 text-sm">
                        <p className="leading-relaxed">{item.question}</p>
                        <PriorityBadge priority="high" />
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="text-primary text-xs hover:underline">
                    View all high priority questions →
                  </button>
                </>
              ) : (
                <SectionEmpty
                  title="No high priority questions"
                  description="High priority questions appear when the agent flags critical validation items."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Questions by Category</CardTitle>
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
                  description="Category distribution is computed from generated questions."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-base">How These Questions Drive Value</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {VALUE_DRIVERS.map((driver) => {
            const Icon = driver.icon
            return (
              <Card key={driver.title} className="bg-muted/10">
                <CardContent className="space-y-2 p-4">
                  <span className={cn('inline-flex size-9 items-center justify-center rounded-lg', driver.color)}>
                    <Icon className="size-4" />
                  </span>
                  <p className="font-medium text-sm">{driver.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{driver.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
