import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { getStructuredReport } from '@/lib/structured-report-utils'
import { cn } from '@/lib/utils'
import type { ReportContent } from '@/types/report'
import { REPORT_NAV_ITEMS, type ReportNavId } from '@/types/structured-report'

import {
  REPORT_NAV_DESCRIPTIONS,
  REPORT_NAV_ICONS,
  ReportNavContent,
  type ReportSessionMeta,
} from './ReportSectionContent'

function SectionNavButton({
  active,
  label,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  description: string
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
        active
          ? 'border-primary/30 bg-primary/10 shadow-sm'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      )}
    >
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-md border',
          active ? 'border-primary/20 bg-primary/15 text-primary' : 'border-border bg-muted/40 text-muted-foreground'
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm', active && 'font-medium text-primary')}>{label}</span>
        <span className="block truncate text-muted-foreground text-xs">{description}</span>
      </span>
      <ChevronRight
        className={cn(
          'size-4 shrink-0 text-muted-foreground/50 transition-transform',
          active && 'text-primary group-hover:translate-x-0.5'
        )}
      />
    </button>
  )
}

interface ReportSectionsViewProps {
  report: ReportContent
  session: ReportSessionMeta
  defaultSection?: ReportNavId
}

export function ReportSectionsView({ report, session, defaultSection = 'company_overview' }: ReportSectionsViewProps) {
  const [activeSection, setActiveSection] = useState<ReportNavId>(defaultSection)
  const structured = getStructuredReport(report, session)

  return (
    <div className="grid min-h-[420px] overflow-hidden rounded-xl border lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:divide-x">
      <aside className="border-b bg-muted/10 p-3 lg:border-b-0">
        <p className="mb-2 px-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">Sections</p>
        <nav className="flex flex-col gap-1">
          {REPORT_NAV_ITEMS.map((section) => {
            const Icon = REPORT_NAV_ICONS[section.id]
            return (
              <SectionNavButton
                key={section.id}
                active={activeSection === section.id}
                label={section.label}
                description={REPORT_NAV_DESCRIPTIONS[section.id]}
                icon={Icon}
                onClick={() => setActiveSection(section.id)}
              />
            )
          })}
        </nav>
      </aside>

      <ScrollArea className="min-h-[420px] max-h-[calc(100vh-16rem)]">
        <div className="p-4 md:p-6">
          <ReportNavContent navId={activeSection} structured={structured} session={session} />
        </div>
      </ScrollArea>
    </div>
  )
}
