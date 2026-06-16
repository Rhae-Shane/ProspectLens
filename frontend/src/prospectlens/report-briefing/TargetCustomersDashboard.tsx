import {
  Building2,
  Check,
  Globe,
  GraduationCap,
  Landmark,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Cell, Pie, PieChart } from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { buildTargetCustomersOverview } from '@/lib/structured-report-utils'
import { cn } from '@/lib/utils'
import { ReportSectionHeader } from '@/prospectlens/report-briefing/ReportSectionHeader'
import { EntityLogo } from '@/prospectlens/EntityLogo'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { CustomerSegmentCard, StructuredReport } from '@/types/structured-report'

const SUMMARY_ICONS: LucideIcon[] = [Users, Globe, Building2, TrendingUp]

const SIZE_MIX_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

const INDUSTRY_BAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-amber-500',
]

const SEGMENT_ICON_MAP: Record<string, LucideIcon> = {
  ecommerce: ShoppingCart,
  retail: ShoppingCart,
  saas: Store,
  platform: Store,
  marketplace: Store,
  education: GraduationCap,
  nonprofit: GraduationCap,
  financial: Landmark,
  fintech: Landmark,
}

function segmentIcon(name: string): LucideIcon {
  const key = name.toLowerCase()
  for (const [token, icon] of Object.entries(SEGMENT_ICON_MAP)) {
    if (key.includes(token)) return icon
  }
  return Users
}

function segmentColorClass(index: number): string {
  const colors = [
    'bg-blue-500/10 text-blue-600',
    'bg-emerald-500/10 text-emerald-600',
    'bg-purple-500/10 text-purple-600',
    'bg-orange-500/10 text-orange-600',
    'bg-cyan-500/10 text-cyan-600',
  ]
  return colors[index % colors.length]
}

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

function SegmentCard({ segment, index }: { segment: CustomerSegmentCard; index: number }) {
  const Icon = segmentIcon(segment.name)

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', segmentColorClass(index))}>
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold text-sm">{segment.name}</h3>
            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{segment.description}</p>
          </div>
        </div>

        {segment.key_needs.length > 0 ? (
          <div className="mb-3">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Key Needs</p>
            <ul className="space-y-1.5">
              {segment.key_needs.slice(0, 4).map((need) => (
                <li key={need} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" />
                  <span>{need}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {segment.example_customers.length > 0 ? (
          <div className="mt-auto border-t pt-3">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Examples</p>
            <div className="flex flex-wrap gap-2">
              {segment.example_customers.slice(0, 4).map((customer) => (
                <div
                  key={customer}
                  className="flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1"
                >
                  <EntityLogo name={customer} type="partner" size="sm" rounded="full" />
                  <span className="text-xs">{customer}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface TargetCustomersDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function TargetCustomersDashboard({
  structured,
  session,
  updatedAt,
}: TargetCustomersDashboardProps) {
  const overview = buildTargetCustomersOverview(structured)

  const sizeMixData = overview.business_size_mix.map((item, index) => ({
    name: item.name,
    value: item.percent,
    fill: SIZE_MIX_COLORS[index % SIZE_MIX_COLORS.length],
  }))

  const sizeMixConfig = overview.business_size_mix.reduce<ChartConfig>((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: SIZE_MIX_COLORS[index % SIZE_MIX_COLORS.length],
    }
    return config
  }, {})

  return (
    <div className="space-y-6">
      <ReportSectionHeader
        title="Target Customers"
        subtitle={`Customer segments, industries, and business profiles that ${session.company_name} serves`}
        updatedAt={updatedAt}
        sessionCreatedAt={session.created_at}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Base Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.summary_metrics.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.summary_metrics.map((metric, index) => {
                  const Icon = SUMMARY_ICONS[index] ?? Users
                  return (
                    <div key={metric.label} className="rounded-lg border bg-muted/10 p-3">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" />
                        <span className="text-xs">{metric.label}</span>
                      </div>
                      <p className="font-semibold text-2xl">{metric.value}</p>
                      {metric.hint ? (
                        <p className="text-muted-foreground text-xs">{metric.hint}</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <SectionEmpty
                title="No customer metrics yet"
                description="Re-run research to populate customer base metrics from agent findings."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Mix by Business Size</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.business_size_mix.length > 0 ? (
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                <ChartContainer config={sizeMixConfig} className="mx-auto aspect-square h-44">
                  <PieChart>
                    <Pie data={sizeMixData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
                      {sizeMixData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="space-y-2">
                  {overview.business_size_mix.map((item, index) => (
                    <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: SIZE_MIX_COLORS[index % SIZE_MIX_COLORS.length] }}
                        />
                        <span>
                          {item.name}
                          {item.range ? (
                            <span className="text-muted-foreground"> ({item.range})</span>
                          ) : null}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">{item.percent}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <SectionEmpty
                title="No business size mix data"
                description="Size distribution appears when supported by research evidence."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-base">Primary Customer Segments</h2>
        {overview.segments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {overview.segments.map((segment, index) => (
              <SegmentCard key={segment.name} segment={segment} index={index} />
            ))}
          </div>
        ) : (
          <SectionEmpty
            title="No customer segments identified"
            description="Segments will appear after the research agent analyzes ICP and target markets."
          />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.industry_distribution.length > 0 ? (
              <>
                <div className="space-y-3">
                  {overview.industry_distribution.map((industry, index) => (
                    <div key={industry.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>{industry.name}</span>
                        <span className="font-medium tabular-nums">{industry.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            INDUSTRY_BAR_COLORS[index % INDUSTRY_BAR_COLORS.length]
                          )}
                          style={{ width: `${Math.min(industry.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {overview.industry_callout?.text ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-500/5 p-3 dark:border-blue-900">
                    <p className="font-medium text-sm">
                      {overview.industry_callout.title || 'Industry Insight'}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                      {overview.industry_callout.text}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <SectionEmpty
                title="No industry distribution data"
                description="Industry breakdown is generated from research when available."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geographic Reach</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.geographic_regions.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
                <div className="relative flex min-h-44 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/5 via-emerald-500/5 to-purple-500/5">
                  <Globe className="size-24 text-muted-foreground/30" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(circle_at_70%_55%,rgba(16,185,129,0.12),transparent_45%)]" />
                </div>
                <div className="space-y-2">
                  <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Top Regions
                  </p>
                  {overview.geographic_regions.map((region) => (
                    <div
                      key={region.name}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2 text-sm"
                    >
                      <span>{region.name}</span>
                      <span className="font-medium tabular-nums">{region.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <SectionEmpty
                title="No geographic data"
                description="Regional customer distribution appears when found in research."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {overview.success_summary ? (
        <Card className="border-blue-200 bg-blue-500/5 dark:border-blue-900">
          <CardContent className="p-5">
            <p className="mb-1 font-semibold text-sm">Customer Success</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{overview.success_summary}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
