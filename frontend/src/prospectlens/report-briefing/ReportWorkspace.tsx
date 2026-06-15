import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  HelpCircle,
  Link2,
  Megaphone,
  MessageCircleQuestion,
  MessageSquare,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { APP_CONFIG } from '@/config/app-config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getStructuredReport } from '@/lib/structured-report-utils'
import { cn, formatDisplayTimestamp } from '@/lib/utils'
import { ChatPanel } from '@/prospectlens/ChatPanel'
import { CompanyOverviewDashboard } from '@/prospectlens/report-briefing/CompanyOverviewDashboard'
import {
  ReportNavContent,
  type ReportSessionMeta,
} from '@/prospectlens/report-briefing/ReportSectionContent'
import type { ReportContent, WorkflowEvent } from '@/types/report'
import {
  REPORT_WORKSPACE_SECTIONS,
  type ReportWorkspaceSectionId,
} from '@/types/structured-report'

const WORKSPACE_ICONS: Record<ReportWorkspaceSectionId, LucideIcon> = {
  company_overview: Building2,
  products: Package,
  customers: Users,
  stakeholders: Users,
  signals: TrendingUp,
  risks: AlertTriangle,
  discovery: MessageCircleQuestion,
  outreach: Megaphone,
  unknowns: HelpCircle,
  sources: Link2,
  chat: MessageSquare,
}

function SidebarNavItem({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

interface ReportWorkspaceProps {
  report: ReportContent
  session: ReportSessionMeta & { id: string; created_at: string }
  events?: WorkflowEvent[]
  backHref?: string
  backLabel?: string
}

export function ReportWorkspace({
  report,
  session,
  backHref = '/reports',
  backLabel = 'Back to Sessions',
}: ReportWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<ReportWorkspaceSectionId>('company_overview')
  const structured = getStructuredReport(report, {
    company_name: session.company_name,
    website: session.website,
    objective: session.objective,
  })

  const createdAt = formatDisplayTimestamp(session.created_at)

  const sessionTitle = `${session.company_name} Research`

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <aside className="flex w-[260px] shrink-0 flex-col border-r bg-muted/20">
        <div className="shrink-0 border-b px-4 py-4">
          <p className="font-semibold text-sm">{APP_CONFIG.name}</p>
          <Button asChild variant="ghost" size="sm" className="mt-3 h-8 w-full justify-start px-2">
            <Link to={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {backLabel}
            </Link>
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-3 py-4">
            <div>
              <p className="mb-2 px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                Research Report
              </p>
              <nav className="space-y-0.5">
                {REPORT_WORKSPACE_SECTIONS.map((section) => (
                  <SidebarNavItem
                    key={section.id}
                    active={activeSection === section.id}
                    label={section.label}
                    icon={WORKSPACE_ICONS[section.id]}
                    onClick={() => setActiveSection(section.id)}
                  />
                ))}
              </nav>
            </div>

            <div>
              <p className="mb-2 px-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                Chat with Report
              </p>
              <SidebarNavItem
                active={activeSection === 'chat'}
                label="AI Assistant"
                icon={Bot}
                onClick={() => setActiveSection('chat')}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t p-3">
          <Card className="bg-card/80 shadow-none">
            <CardContent className="space-y-2 p-3">
              <p className="truncate font-medium text-sm">{sessionTitle}</p>
              <Badge
                variant="outline"
                className="border-green-200 bg-green-500/10 text-green-700 dark:text-green-300"
              >
                Completed
              </Badge>
              <p className="text-muted-foreground text-xs">{createdAt}</p>
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 md:p-8">
            {activeSection === 'company_overview' ? (
              <CompanyOverviewDashboard
                structured={structured}
                session={session}
                updatedAt={session.created_at}
              />
            ) : null}

            {activeSection === 'chat' ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h1 className="font-semibold text-2xl tracking-tight">AI Assistant</h1>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Ask follow-up questions about {session.company_name}.
                  </p>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <ChatPanel sessionId={session.id} enabled />
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeSection !== 'company_overview' && activeSection !== 'chat' ? (
              <ReportNavContent
                navId={activeSection}
                structured={structured}
                session={session}
              />
            ) : null}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
