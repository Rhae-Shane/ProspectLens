import {
  Calendar,
  FileText,
  Handshake,
  Linkedin,
  Mail,
  Megaphone,
  Phone,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
  Youtube,
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
import { buildOutreachOverview } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type {
  ChannelImpact,
  OutreachEffectiveness,
  OutreachTimingCell,
  StructuredReport,
  TimingQuality,
} from '@/types/structured-report'

const SUMMARY_ICONS: LucideIcon[] = [Target, Users, Megaphone, TrendingUp]

const MIX_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
]

const EFFECTIVENESS_STYLES: Record<OutreachEffectiveness, string> = {
  high: 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300',
  medium: 'border-orange-200 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  low: 'border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300',
}

const IMPACT_BAR_COLORS: Record<ChannelImpact, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-orange-500',
  low: 'bg-blue-500',
}

const TIMING_STYLES: Record<TimingQuality, string> = {
  best: 'bg-emerald-500/80',
  good: 'bg-amber-400/80',
  okay: 'bg-amber-200/60',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const TIMES = ['9AM', '11AM', '1PM', '3PM', '5PM', '7PM'] as const

const MESSAGING_TIPS = [
  'Personalize based on role and company needs.',
  'Focus on business outcomes, not just features.',
  'Use data and case studies to build credibility.',
  'Keep messages concise, relevant, and actionable.',
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

function channelIcon(name: string): LucideIcon {
  const key = name.toLowerCase()
  if (key.includes('linkedin')) return Linkedin
  if (key.includes('email')) return Mail
  if (key.includes('phone')) return Phone
  if (key.includes('event')) return Calendar
  if (key.includes('youtube')) return Youtube
  if (key.includes('webinar')) return Video
  if (key.includes('partner')) return Handshake
  if (key.includes('content') || key.includes('blog')) return FileText
  if (key.includes('paid') || key.includes('campaign')) return Megaphone
  if (key.includes('seo') || key.includes('inbound')) return Search
  return Mail
}

function strategyIcon(name: string): LucideIcon {
  const key = name.toLowerCase()
  if (key.includes('direct')) return Target
  if (key.includes('event') || key.includes('community')) return Users
  if (key.includes('content') || key.includes('thought')) return FileText
  if (key.includes('partner')) return Handshake
  if (key.includes('inbound') || key.includes('seo')) return Search
  if (key.includes('account') || key.includes('abm')) return Sparkles
  return Megaphone
}

function strategyColorClass(index: number): string {
  const colors = [
    'bg-blue-500/10 text-blue-600',
    'bg-purple-500/10 text-purple-600',
    'bg-emerald-500/10 text-emerald-600',
    'bg-orange-500/10 text-orange-600',
    'bg-cyan-500/10 text-cyan-600',
    'bg-pink-500/10 text-pink-600',
  ]
  return colors[index % colors.length]
}

function normalizeDay(day: string): string {
  return day.trim().slice(0, 3).toLowerCase()
}

function timingQuality(
  cells: OutreachTimingCell[],
  day: (typeof DAYS)[number],
  time: (typeof TIMES)[number]
): TimingQuality | null {
  const match = cells.find(
    (cell) => normalizeDay(cell.day) === day.toLowerCase() && cell.time === time
  )
  return match?.quality ?? null
}

function effectivenessDots(score?: number, effectiveness?: OutreachEffectiveness): number {
  if (score) return Math.min(5, Math.max(1, Math.round(score)))
  if (effectiveness === 'high') return 5
  if (effectiveness === 'medium') return 3
  return 2
}

function channelBarWidth(channel: { score?: number; impact: ChannelImpact }): number {
  if (channel.score) return Math.min(channel.score, 100)
  if (channel.impact === 'high') return 90
  if (channel.impact === 'medium') return 65
  return 40
}

function ImpactGauge({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const pct = Math.min(Math.max(score / maxScore, 0), 1)
  const angle = pct * 180
  const radians = (angle * Math.PI) / 180

  return (
    <div className="relative mx-auto h-32 w-56">
      <svg viewBox="0 0 200 110" className="h-full w-full" aria-hidden>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-muted/30"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#impactGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251} 251`}
        />
        <defs>
          <linearGradient id="impactGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle
          cx={100 + 80 * Math.cos(Math.PI - radians)}
          cy={100 - 80 * Math.sin(radians)}
          r="6"
          className="fill-primary"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-2 text-center">
        <p className="font-semibold text-3xl">{score.toFixed(1)}</p>
        <p className="text-muted-foreground text-xs">/ {maxScore}</p>
      </div>
    </div>
  )
}

function EffectivenessMeter({
  effectiveness,
  score,
}: {
  effectiveness: OutreachEffectiveness
  score?: number
}) {
  const filled = effectivenessDots(score, effectiveness)
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'size-2 rounded-full',
              index < filled ? 'bg-emerald-500' : 'bg-muted'
            )}
          />
        ))}
      </div>
      <Badge variant="outline" className={cn('text-[10px] capitalize', EFFECTIVENESS_STYLES[effectiveness])}>
        {effectiveness}
      </Badge>
    </div>
  )
}

interface OutreachStrategiesDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function OutreachStrategiesDashboard({
  structured,
  session,
  updatedAt,
}: OutreachStrategiesDashboardProps) {
  const overview = buildOutreachOverview(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)

  const mixData = overview.strategy_mix.map((item, index) => ({
    name: item.name,
    value: item.percent,
    fill: MIX_COLORS[index % MIX_COLORS.length],
  }))

  const mixConfig = overview.strategy_mix.reduce<ChartConfig>((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: MIX_COLORS[index % MIX_COLORS.length],
    }
    return config
  }, {})

  const tips = overview.messaging_tips?.length ? overview.messaging_tips : MESSAGING_TIPS

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Outreach Strategies</h1>
          <p className="text-muted-foreground text-sm">
            Recommended approaches, channels, and messaging to engage key stakeholders at{' '}
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outreach Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.summary_counts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.summary_counts.map((item, index) => {
                  const Icon = SUMMARY_ICONS[index] ?? Target
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
                title="No outreach metrics yet"
                description="Re-run research to generate outreach strategy metrics."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expected Impact</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {overview.expected_impact.score > 0 ? (
              <>
                <ImpactGauge
                  score={overview.expected_impact.score}
                  maxScore={overview.expected_impact.max_score ?? 10}
                />
                <p className="mt-2 font-medium text-sm">{overview.expected_impact.label}</p>
                {overview.expected_impact.description ? (
                  <p className="text-muted-foreground text-xs">{overview.expected_impact.description}</p>
                ) : null}
              </>
            ) : (
              <SectionEmpty
                title="Impact score pending"
                description="Expected impact is calculated when outreach strategies are generated."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outreach Strategy Mix</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.strategy_mix.length > 0 ? (
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                <ChartContainer config={mixConfig} className="mx-auto aspect-square h-36">
                  <PieChart>
                    <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62}>
                      {mixData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="space-y-1.5">
                  {overview.strategy_mix.map((item, index) => (
                    <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: MIX_COLORS[index % MIX_COLORS.length] }}
                        />
                        {item.name}
                      </span>
                      <span className="font-medium tabular-nums">{item.percent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SectionEmpty
                title="No strategy mix data"
                description="Strategy distribution appears when outreach approaches are generated."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outreach Strategies</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {overview.strategies.length > 0 ? (
              <>
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-3 pr-4 font-medium">Strategy</th>
                      <th className="pb-3 pr-4 font-medium">Description</th>
                      <th className="pb-3 pr-4 font-medium">Best For</th>
                      <th className="pb-3 pr-4 font-medium">Primary Channels</th>
                      <th className="pb-3 pr-4 font-medium">Effectiveness</th>
                      <th className="pb-3 font-medium">Time to Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.strategies.map((strategy, index) => {
                      const Icon = strategyIcon(strategy.name)
                      return (
                        <tr key={strategy.name} className="border-b align-top last:border-b-0">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'grid size-8 shrink-0 place-items-center rounded-lg',
                                  strategyColorClass(index)
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <span className="font-medium">{strategy.name}</span>
                            </div>
                          </td>
                          <td className="max-w-xs py-4 pr-4 text-muted-foreground text-xs leading-relaxed">
                            {strategy.description}
                          </td>
                          <td className="py-4 pr-4 text-xs">{strategy.best_for}</td>
                          <td className="py-4 pr-4">
                            <div className="flex flex-wrap gap-1.5">
                              {strategy.primary_channels.map((channel) => {
                                const ChannelIcon = channelIcon(channel)
                                return (
                                  <span
                                    key={channel}
                                    className="inline-flex items-center gap-1 rounded-md border bg-muted/20 px-2 py-1 text-[10px]"
                                  >
                                    <ChannelIcon className="size-3" />
                                    {channel}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <EffectivenessMeter
                              effectiveness={strategy.effectiveness}
                              score={strategy.effectiveness_score}
                            />
                          </td>
                          <td className="py-4 text-xs">{strategy.time_to_impact}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <button type="button" className="mt-3 text-primary text-sm hover:underline">
                  View all {overview.strategies.length} strategies →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No outreach strategies yet"
                description="Strategies are generated from stakeholders, signals, and discovery questions."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.recommended_channels.length > 0 ? (
                overview.recommended_channels.map((channel) => {
                  const Icon = channelIcon(channel.name)
                  return (
                    <div key={channel.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Icon className="size-3.5 text-muted-foreground" />
                          {channel.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {channel.impact} impact
                        </Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', IMPACT_BAR_COLORS[channel.impact])}
                          style={{ width: `${channelBarWidth(channel)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <SectionEmpty
                  title="No channel recommendations"
                  description="Channel rankings appear when outreach data is available."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Best Time to Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.outreach_timing.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-[3rem_repeat(5,1fr)] gap-1 text-center text-[10px] text-muted-foreground">
                    <span />
                    {DAYS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  {TIMES.map((time) => (
                    <div key={time} className="grid grid-cols-[3rem_repeat(5,1fr)] gap-1">
                      <span className="pt-1 text-[10px] text-muted-foreground">{time}</span>
                      {DAYS.map((day) => {
                        const quality = timingQuality(overview.outreach_timing, day, time)
                        return (
                          <span
                            key={`${day}-${time}`}
                            className={cn(
                              'h-7 rounded-sm border',
                              quality ? TIMING_STYLES[quality] : 'bg-muted/20'
                            )}
                            title={quality ? `${day} ${time}: ${quality}` : undefined}
                          />
                        )
                      })}
                    </div>
                  ))}
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-sm bg-emerald-500/80" /> Best
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-sm bg-amber-400/80" /> Good
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-sm bg-amber-200/60" /> Okay
                    </span>
                  </div>
                </div>
              ) : (
                <SectionEmpty
                  title="No timing data"
                  description="Outreach timing heatmap appears when the agent provides scheduling guidance."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target Personas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {overview.target_personas.length > 0 ? (
              <>
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-3 pr-3 font-medium">Persona</th>
                      <th className="pb-3 pr-3 font-medium">Role</th>
                      <th className="pb-3 pr-3 font-medium">Goal / Interest</th>
                      <th className="pb-3 font-medium">Preferred Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.target_personas.map((persona) => (
                      <tr key={persona.persona} className="border-b align-top last:border-b-0">
                        <td className="py-3 pr-3 font-medium text-xs">{persona.persona}</td>
                        <td className="py-3 pr-3 text-muted-foreground text-xs">{persona.role}</td>
                        <td className="max-w-xs py-3 pr-3 text-xs leading-relaxed">
                          {persona.goal_interest}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {persona.preferred_channels.map((channel) => {
                              const Icon = channelIcon(channel)
                              return <Icon key={channel} className="size-3.5 text-muted-foreground" />
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="mt-3 text-primary text-xs hover:underline">
                  View all {overview.target_personas.length} personas →
                </button>
              </>
            ) : (
              <SectionEmpty
                title="No target personas"
                description="Personas are mapped from stakeholder research and ICP analysis."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Messaging Themes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.messaging_themes.length > 0 ? (
              overview.messaging_themes.map((theme, index) => {
                const Icon = strategyIcon(theme.title)
                return (
                  <div key={theme.title} className="flex gap-3 rounded-lg border bg-muted/10 p-3">
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg',
                        strategyColorClass(index)
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-medium text-sm">{theme.title}</p>
                      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <SectionEmpty
                title="No messaging themes"
                description="Themes are derived from company signals and stakeholder priorities."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Messaging Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-muted-foreground text-xs leading-relaxed">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
