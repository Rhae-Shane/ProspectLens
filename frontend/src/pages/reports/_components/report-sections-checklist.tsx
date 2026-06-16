import { REPORT_NAV_ITEMS } from '@/types/structured-report'
import type { StructuredReport } from '@/types/structured-report'
import { isNavItemComplete } from '@/lib/structured-report-utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface ReportSectionsChecklistProps {
  structured: StructuredReport
}

export function ReportSectionsChecklist({ structured }: ReportSectionsChecklistProps) {
  const completedCount = REPORT_NAV_ITEMS.filter((item) => isNavItemComplete(structured, item.id)).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Report sections</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {completedCount}/{REPORT_NAV_ITEMS.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {REPORT_NAV_ITEMS.map((item) => {
            const done = isNavItemComplete(structured, item.id)
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <Checkbox checked={done} disabled aria-label={item.label} />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm', done && 'text-muted-foreground line-through')}>
                    {item.number}. {item.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
