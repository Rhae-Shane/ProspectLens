import { Button } from '@/components/ui/button'
import { formatDisplayTimestamp } from '@/lib/utils'
import { useReportActions } from '@/prospectlens/report-briefing/report-actions-context'

interface ReportSectionHeaderProps {
  title: string
  subtitle: string
  updatedAt?: string
  sessionCreatedAt?: string
}

export function ReportSectionHeader({
  title,
  subtitle,
  updatedAt,
  sessionCreatedAt,
}: ReportSectionHeaderProps) {
  const actions = useReportActions()
  const formattedDate = formatDisplayTimestamp(updatedAt ?? sessionCreatedAt ?? '')

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={() => actions?.onViewFullReport()}>
            View Full Report
          </Button>
          <Button size="sm" type="button" onClick={() => actions?.onExportPdf()}>
            Export PDF
          </Button>
        </div>
        {formattedDate ? (
          <p className="text-muted-foreground text-xs">Last updated: {formattedDate}</p>
        ) : null}
      </div>
    </div>
  )
}
