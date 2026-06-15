import {
  BarChart3,
  Calculator,
  Check,
  Code2,
  CreditCard,
  Globe,
  Layers,
  Link2,
  Package,
  Receipt,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Pie, PieChart, Cell } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import { buildProductsServices } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { CoreProduct, StructuredReport } from '@/types/structured-report'

const METRIC_ICONS: LucideIcon[] = [Package, Globe, Layers, Zap]

const CATEGORY_CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const BADGE_STYLES: Record<string, string> = {
  core: 'border-blue-200 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  risk: 'border-red-200 bg-red-500/10 text-red-700 dark:text-red-300',
  analytics: 'border-purple-200 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  financial: 'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  compliance: 'border-amber-200 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  default: 'border-border bg-muted/40 text-muted-foreground',
}

const PRODUCT_ICON_MAP: Record<string, LucideIcon> = {
  payments: CreditCard,
  billing: Receipt,
  connect: Link2,
  radar: Shield,
  sigma: BarChart3,
  issuing: Wallet,
  capital: Sparkles,
  tax: Calculator,
  checkout: CreditCard,
  terminal: Zap,
  atlas: Globe,
  treasury: Wallet,
  identity: Shield,
  climate: Sparkles,
}

function productIcon(name: string): LucideIcon {
  const key = name.toLowerCase().split(' ')[0] ?? ''
  return PRODUCT_ICON_MAP[key] ?? Package
}

function iconColorClass(index: number): string {
  const colors = [
    'bg-blue-500/10 text-blue-600',
    'bg-purple-500/10 text-purple-600',
    'bg-emerald-500/10 text-emerald-600',
    'bg-orange-500/10 text-orange-600',
    'bg-cyan-500/10 text-cyan-600',
    'bg-pink-500/10 text-pink-600',
    'bg-indigo-500/10 text-indigo-600',
    'bg-amber-500/10 text-amber-600',
  ]
  return colors[index % colors.length]
}

function CoreProductCard({ product, index }: { product: CoreProduct; index: number }) {
  const Icon = productIcon(product.name)
  const badgeStyle = BADGE_STYLES[product.category_color ?? 'default'] ?? BADGE_STYLES.default

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', iconColorClass(index))}>
              <Icon className="size-5" />
            </span>
            <h3 className="font-semibold text-sm">{product.name}</h3>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px]', badgeStyle)}>
            {product.category}
          </Badge>
        </div>
        <p className="mb-3 text-muted-foreground text-sm leading-relaxed">{product.description}</p>
        <ul className="mt-auto space-y-1.5">
          {product.features.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-3.5 shrink-0 text-green-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

interface ProductsServicesDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function ProductsServicesDashboard({
  structured,
  session,
  updatedAt,
}: ProductsServicesDashboardProps) {
  const overview = buildProductsServices(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)

  const chartData = overview.categories.map((category, index) => ({
    name: category.name,
    value: category.percent,
    fill: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
  }))

  const chartConfig = overview.categories.reduce<ChartConfig>((config, category, index) => {
    config[category.name] = {
      label: category.name,
      color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
    }
    return config
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Products & Services</h1>
          <p className="text-muted-foreground text-sm">
            Overview of {session.company_name}&apos;s core products and capabilities
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
            <CardTitle className="text-base">Product Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">{overview.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {overview.portfolio_metrics.map((metric, index) => {
                const Icon = METRIC_ICONS[index] ?? Package
                return (
                  <div key={metric.label} className="rounded-lg border bg-muted/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                      <Icon className="size-4" />
                      <span className="text-xs">{metric.label}</span>
                    </div>
                    <p className="font-semibold text-lg">{metric.value}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Product Categories</CardTitle>
          </CardHeader>
          <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-44">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={75}
                  cornerRadius={4}
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
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
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length] }}
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

      <div>
        <h2 className="mb-3 font-semibold text-base">Core Products</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overview.core_products.map((product, index) => (
            <CoreProductCard key={`${product.name}-${index}`} product={product} index={index} />
          ))}
        </div>
      </div>

      {overview.additional_capabilities.length > 0 ? (
        <div>
          <h2 className="mb-3 font-semibold text-base">Additional Capabilities</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {overview.additional_capabilities.map((capability, index) => {
              const Icon = productIcon(capability.name)
              return (
                <Card key={`${capability.name}-${index}`} className="bg-muted/10">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn('grid size-8 place-items-center rounded-md', iconColorClass(index + 2))}>
                        <Icon className="size-4" />
                      </span>
                      <p className="font-medium text-sm">{capability.name}</p>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{capability.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}

      {overview.developer_note?.text ? (
        <div className="flex gap-3 rounded-xl border border-blue-200/60 bg-blue-500/5 p-4 dark:border-blue-900/40">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
            <Code2 className="size-5" />
          </span>
          <div>
            <p className="font-medium text-sm">{overview.developer_note.title}</p>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{overview.developer_note.text}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
