import {
  Award,
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  Link2,
  Newspaper,
  Shield,
  Star,
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
import { buildSourcesOverview } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { StructuredReport } from '@/types/structured-report'

const SUMMARY_ICONS: LucideIcon[] = [Link2, FileText, BookOpen, Layers, Award]

const TYPE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const CATEGORY_BAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-cyan-500',
]

const TYPE_BADGE_STYLES: Record<string, string> = {
  'News & Media': 'border-blue-200 bg-blue-500/10 text-blue-700',
  'Company Documents': 'border-purple-200 bg-purple-500/10 text-purple-700',
  'Reports & Research': 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
  Websites: 'border-orange-200 bg-orange-500/10 text-orange-700',
  'Social Media': 'border-cyan-200 bg-cyan-500/10 text-cyan-700',
}

const HIGHLIGHT_ICONS = [Shield, Clock, Star, Layers] as const

const DEFAULT_HIGHLIGHTS = [
  {
    title: 'Diverse & Credible',
    description: 'Mix of official documents, reputable media, and research coverage.',
  },
  {
    title: 'Up-to-Date',
    description: 'Majority of sources accessed during the latest research run.',
  },
  {
    title: 'High Reliability',
    description: 'Most sources rated high or very high for credibility.',
  },
  {
    title: 'Well-Categorized',
    description: 'Sources organized by type and topic for easy reference.',
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

function typeIcon(type: string): LucideIcon {
  if (type.includes('News')) return Newspaper
  if (type.includes('Company')) return FileText
  if (type.includes('Research')) return BookOpen
  if (type.includes('Social')) return Globe
  return Link2
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'size-3.5',
            index < rating ? 'fill-amber-400 text-amber-400' : 'text-muted'
          )}
        />
      ))}
    </div>
  )
}

interface SourcesDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function SourcesDashboard({ structured, session, updatedAt }: SourcesDashboardProps) {
  const overview = buildSourcesOverview(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)
  const totalSources = overview.summary_counts[0]?.value ?? overview.sources.length

  const typeChartData = overview.source_type_mix.map((item, index) => ({
    name: item.name,
    value: item.count,
    fill: TYPE_COLORS[index % TYPE_COLORS.length],
  }))

  const typeChartConfig = overview.source_type_mix.reduce<ChartConfig>((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: TYPE_COLORS[index % TYPE_COLORS.length],
    }
    return config
  }, {})

  const highlights =
    overview.highlights.length > 0
      ? overview.highlights.map((item, index) => ({
          ...item,
          icon: HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length],
        }))
      : DEFAULT_HIGHLIGHTS.map((item, index) => ({
          ...item,
          icon: HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length],
        }))

  const recentSources =
    overview.recent_sources.length > 0
      ? overview.recent_sources
      : overview.sources.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Sources</h1>
          <p className="text-muted-foreground text-sm">
            Trusted sources and references used to build this research report on{' '}
            {session.company_name}
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
            <CardTitle className="text-base">Sources Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.summary_counts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overview.summary_counts.map((item, index) => {
                  const Icon = SUMMARY_ICONS[index] ?? Link2
                  return (
                    <div key={item.label} className="rounded-lg border bg-muted/10 p-3">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" />
                        <span className="text-xs">{item.label}</span>
                      </div>
                      <p className="font-semibold text-2xl">{item.value}</p>
                      {item.hint ? <p className="text-muted-foreground text-xs">{item.hint}</p> : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <SectionEmpty
                title="No source metrics yet"
                description="Re-run research to populate source metrics."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sources by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.source_type_mix.length > 0 && totalSources ? (
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                <div className="relative">
                  <ChartContainer config={typeChartConfig} className="mx-auto aspect-square h-40">
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={72}
                      >
                        {typeChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-semibold text-2xl">{totalSources}</p>
                    <p className="text-muted-foreground text-xs">Total</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {overview.source_type_mix.map((item, index) => (
                    <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: TYPE_COLORS[index % TYPE_COLORS.length] }}
                        />
                        {item.name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {item.count} ({item.percent}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SectionEmpty
                title="No source type breakdown"
                description="Source types appear when research citations are available."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Sources</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {overview.sources.length > 0 ? (
              <>
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-3 pr-4 font-medium">Source Title</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Category</th>
                      <th className="pb-3 pr-4 font-medium">Reliability</th>
                      <th className="pb-3 pr-4 font-medium">Accessed On</th>
                      <th className="pb-3 font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.sources.slice(0, 12).map((source, index) => {
                      const Icon = typeIcon(source.type)
                      return (
                        <tr key={`${source.url}-${index}`} className="border-b align-top last:border-b-0">
                          <td className="max-w-xs py-4 pr-4">
                            <div className="flex items-start gap-2">
                              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              <span className="font-medium leading-relaxed">{source.title}</span>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                TYPE_BADGE_STYLES[source.type] ?? 'bg-muted/40'
                              )}
                            >
                              {source.type}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4 text-xs">{source.category}</td>
                          <td className="py-4 pr-4">
                            <StarRating rating={source.reliability} />
                          </td>
                          <td className="py-4 pr-4 text-muted-foreground text-xs">
                            {source.accessed_on}
                          </td>
                          <td className="py-4">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                            >
                              View
                              <ExternalLink className="size-3" />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <button type="button" className="mt-3 text-primary text-sm hover:underline">
                  View all {overview.sources.length} sources →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No sources cited"
                description="Sources are collected from research providers during report generation."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Source Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.category_breakdown.length > 0 ? (
                overview.category_breakdown.map((category, index) => (
                  <div key={category.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>{category.name}</span>
                      <span className="font-medium tabular-nums">{category.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length]
                        )}
                        style={{
                          width: `${Math.min((category.count / (Number(totalSources) || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <SectionEmpty
                  title="No category breakdown"
                  description="Categories are computed from classified sources."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Source Reliability Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.reliability_breakdown.length > 0 ? (
                overview.reliability_breakdown
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div key={item.stars} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2">
                          <StarRating rating={item.stars} />
                          <span className="text-muted-foreground text-xs">{item.label}</span>
                        </span>
                        <span className="font-medium tabular-nums">
                          {item.count} ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.min(item.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
              ) : (
                <SectionEmpty
                  title="No reliability data"
                  description="Reliability ratings are assigned when sources are classified."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source Highlights</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-3 rounded-lg border bg-muted/10 p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
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
            <CardTitle className="text-base">Most Recent Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSources.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {recentSources.map((source, index) => (
                    <li key={`${source.url}-${index}`} className="space-y-1 text-sm">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium leading-relaxed hover:text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                      <p className="text-muted-foreground text-xs">{source.accessed_on}</p>
                    </li>
                  ))}
                </ul>
                <button type="button" className="text-primary text-xs hover:underline">
                  View all recent sources →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No recent sources"
                description="Recent sources appear after research completes."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
