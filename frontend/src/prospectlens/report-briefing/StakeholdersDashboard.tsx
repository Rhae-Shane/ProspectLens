import {
  Building2,
  Check,
  ExternalLink,
  Linkedin,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Cell, Pie, PieChart } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import { buildStakeholdersOverview } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import { EntityLogo } from '@/prospectlens/EntityLogo'
import { PersonAvatar } from '@/prospectlens/PersonAvatar'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'
import type { StructuredReport } from '@/types/structured-report'

const SUMMARY_ICONS: LucideIcon[] = [Users, UserRound, Building2, Users]

const GROUP_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function linkedinHref(url: string | undefined, name: string, company: string): string {
  if (url?.trim()) return url
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${company}`)}`
}

interface StakeholdersDashboardProps {
  structured: StructuredReport
  session: ReportSessionMeta
  updatedAt?: string
}

export function StakeholdersDashboard({
  structured,
  session,
  updatedAt,
}: StakeholdersDashboardProps) {
  const overview = buildStakeholdersOverview(structured)
  const formattedDate = formatDisplayTimestamp(updatedAt ?? session.created_at)

  const chartData = overview.groups.map((group, index) => ({
    name: group.name,
    value: group.count,
    fill: GROUP_COLORS[index % GROUP_COLORS.length],
  }))

  const chartConfig = overview.groups.reduce<ChartConfig>((config, group, index) => {
    config[group.name] = {
      label: group.name,
      color: GROUP_COLORS[index % GROUP_COLORS.length],
    }
    return config
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Stakeholders</h1>
          <p className="text-muted-foreground text-sm">
            Key people and organizations involved with or influencing {session.company_name}&apos;s business
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
            <CardTitle className="text-base">Stakeholder Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {overview.summary_counts.map((item, index) => {
              const Icon = SUMMARY_ICONS[index] ?? Users
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stakeholder Groups</CardTitle>
          </CardHeader>
          <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-44">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-2">
              {overview.groups.map((group, index) => (
                <li key={group.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: GROUP_COLORS[index % GROUP_COLORS.length] }}
                    />
                    {group.name}
                  </span>
                  <span className="font-medium tabular-nums">{group.percent}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Key People — Executive Leadership</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground text-xs">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Focus Areas</th>
                <th className="pb-3 pr-4 font-medium">Background</th>
                <th className="pb-3 font-medium">LinkedIn</th>
              </tr>
            </thead>
            <tbody>
              {overview.executives.map((executive) => (
                <tr key={executive.name} className="border-b align-top last:border-b-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <PersonAvatar
                        name={executive.name}
                        linkedinUrl={executive.linkedin_url}
                        className="size-10"
                      />
                      <div>
                        <p className="font-medium">{executive.name}</p>
                        {executive.tag ? (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            {executive.tag}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-muted-foreground">{executive.title}</td>
                  <td className="py-4 pr-4">
                    <ul className="space-y-1">
                      {executive.focus_areas.slice(0, 3).map((area) => (
                        <li key={area} className="flex items-start gap-2 text-xs">
                          <Check className="mt-0.5 size-3 shrink-0 text-green-600" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="max-w-xs py-4 pr-4 text-muted-foreground text-xs leading-relaxed">
                    {executive.background}
                  </td>
                  <td className="py-4">
                    <a
                      href={linkedinHref(executive.linkedin_url, executive.name, session.company_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      aria-label={`LinkedIn profile for ${executive.name}`}
                    >
                      <Linkedin className="size-4" />
                      <ExternalLink className="size-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="mt-3 text-primary text-sm hover:underline">
            View all executives ({overview.executives.length}) →
          </button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Board of Directors</CardTitle>
            <button type="button" className="text-primary text-xs hover:underline">
              View all
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.board_members.map((member, index) => (
              <div key={member.name} className="flex items-center gap-3">
                <PersonAvatar
                  name={member.name}
                  linkedinUrl={member.linkedin_url}
                  className="size-9"
                  fallbackClassName={cn(
                    'text-xs',
                    index % 3 === 0 && 'bg-blue-500/10 text-blue-700',
                    index % 3 === 1 && 'bg-purple-500/10 text-purple-700',
                    index % 3 === 2 && 'bg-emerald-500/10 text-emerald-700'
                  )}
                />
                <div>
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-muted-foreground text-xs">{member.role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Key Investors</CardTitle>
            <button type="button" className="text-primary text-xs hover:underline">
              View all
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.investors.map((investor) => (
              <div key={investor.name} className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
                <EntityLogo name={investor.name} website={investor.website} type="investor" size="md" />
                <p className="font-medium text-sm">{investor.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Strategic Partners</CardTitle>
            <button type="button" className="text-primary text-xs hover:underline">
              View all
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.partners.map((partner) => (
              <div key={partner.name} className="flex items-center gap-3 rounded-lg border bg-muted/10 p-3">
                <EntityLogo name={partner.name} website={partner.website} type="partner" size="md" />
                <p className="font-medium text-sm">{partner.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-base">Other Key Stakeholders</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {overview.other_groups.map((group) => (
            <Card key={group.label} className="bg-muted/10">
              <CardContent className="space-y-2 p-4">
                <p className="font-medium text-sm">{group.label}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{group.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
