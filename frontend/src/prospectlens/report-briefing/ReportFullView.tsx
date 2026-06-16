import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getStructuredReport } from '@/lib/structured-report-utils'
import type { ReportContent } from '@/types/report'
import type { ReportSessionMeta } from '@/prospectlens/report-briefing/ReportSectionContent'

interface ReportFullViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportContent
  session: ReportSessionMeta
}

export function ReportFullView({ open, onOpenChange, report, session }: ReportFullViewProps) {
  const structured = getStructuredReport(report, {
    company_name: session.company_name,
    website: session.website,
    objective: session.objective,
  })

  const snap = structured.company_snapshot
  const sections: { title: string; items: string[] }[] = [
    {
      title: 'Company Snapshot',
      items: [
        snap?.industry && `Industry: ${snap.industry}`,
        snap?.founded && `Founded: ${snap.founded}`,
        snap?.hq && `HQ: ${snap.hq}`,
        snap?.employees && `Employees: ${snap.employees}`,
        snap?.ceo && `CEO: ${snap.ceo}`,
        structured.company_overview?.description,
      ].filter(Boolean) as string[],
    },
    {
      title: 'Products',
      items: (structured.products_services?.core_products ?? structured.products ?? []).map(
        (p) => `${p.name}: ${p.description ?? ''}`
      ),
    },
    {
      title: 'Target Customers',
      items: (structured.target_customers_overview?.segments ?? structured.target_customers ?? []).map(
        (s) => `${'name' in s ? s.name : s.segment}`
      ),
    },
    {
      title: 'Stakeholders',
      items: (structured.stakeholders_overview?.executives ?? structured.stakeholders ?? []).map(
        (e) => `${e.name} — ${'title' in e ? e.title : ''}`
      ),
    },
    {
      title: 'Business Signals',
      items: (structured.business_signals?.key_signals ?? structured.signals ?? []).map(
        (s) => `${s.title ?? s.signal}`
      ),
    },
    {
      title: 'Risks',
      items: (structured.risks_challenges?.top_risks ?? structured.risks ?? []).map(
        (r) => `${r.title ?? r.risk}`
      ),
    },
    {
      title: 'Discovery Questions',
      items: (structured.discovery_questions_overview?.questions ?? structured.discovery_questions ?? []).map(
        (q) => ('question' in q ? q.question : String(q))
      ),
    },
    {
      title: 'Outreach',
      items: (structured.outreach_overview?.strategies ?? []).map((s) => s.name),
    },
    {
      title: 'Unknowns',
      items: (structured.unknowns_overview?.unknown_items ?? structured.unknowns ?? []).map((u) =>
        typeof u === 'string' ? u : u.unknown
      ),
    },
    {
      title: 'Sources',
      items: (structured.sources_overview?.sources ?? structured.sources ?? []).map((s) => s.title),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{session.company_name} — Full Research Report</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-5rem)] px-6 py-4">
          <div className="space-y-6 pb-6">
            {sections.map((section) =>
              section.items.length > 0 ? (
                <div key={section.title}>
                  <h3 className="mb-2 font-semibold text-base">{section.title}</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {section.items.map((item, index) => (
                      <li key={`${section.title}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
