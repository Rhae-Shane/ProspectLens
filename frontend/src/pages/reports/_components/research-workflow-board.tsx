import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WorkflowEvent } from '@/types/report'

const WORKFLOW_COLUMNS = [
  { id: 'planned', label: 'Planned', nodes: ['planner'] },
  { id: 'building', label: 'Building', nodes: ['research', 'analyze', 'recovery'] },
  { id: 'qa', label: 'QA', nodes: ['quality_check'] },
  { id: 'reporting', label: 'Report', nodes: ['report_generator', 'report_snapshot', 'report_products', 'report_stakeholders', 'report_signals_risks', 'report_discovery', 'report_outreach', 'report_sources'] },
  { id: 'done', label: 'Done', nodes: ['workflow'] },
] as const

const NODE_LABELS: Record<string, string> = {
  planner: 'Planner',
  research: 'Research',
  analyze: 'Analyze',
  quality_check: 'Quality Check',
  recovery: 'Recovery',
  report_generator: 'Report Assembler',
  report_snapshot: 'Snapshot',
  report_products: 'Products',
  report_stakeholders: 'Stakeholders',
  report_signals_risks: 'Signals & Risks',
  report_discovery: 'Discovery',
  report_outreach: 'Outreach',
  report_sources: 'Sources',
  workflow: 'Workflow Complete',
}

function columnForNode(node: string): string {
  for (const column of WORKFLOW_COLUMNS) {
    if ((column.nodes as readonly string[]).includes(node)) return column.id
  }
  return 'building'
}

interface BoardCard {
  id: string
  node: string
  label: string
  status: string
  time: string
  meta?: string
}

interface ResearchWorkflowBoardProps {
  events: WorkflowEvent[]
}

export function ResearchWorkflowBoard({ events }: ResearchWorkflowBoardProps) {
  const cards = useMemo(() => {
    const items: BoardCard[] = []
    for (const event of events) {
      if (event.event_type !== 'completed' && event.event_type !== 'started') continue
      const outputs = (event.payload.node_outputs ?? {}) as Record<string, unknown>
      const metaParts = Object.entries(outputs)
        .slice(0, 2)
        .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)

      items.push({
        id: event.id,
        node: event.node,
        label: NODE_LABELS[event.node] ?? event.node,
        status: event.event_type,
        time: format(parseISO(event.created_at), 'h:mm a'),
        meta: metaParts.join(' · ') || undefined,
      })
    }
    return items
  }, [events])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(WORKFLOW_COLUMNS.map((column) => [column.id, [] as BoardCard[]])) as Record<
      string,
      BoardCard[]
    >
    for (const card of cards) {
      map[columnForNode(card.node)]?.push(card)
    }
    return map
  }, [cards])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Research Workflow Board</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {WORKFLOW_COLUMNS.map((column) => {
          const columnCards = grouped[column.id] ?? []
          if (columnCards.length === 0) return null
          return (
            <div key={column.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{column.label}</p>
                <Badge variant="secondary" className="text-[10px]">
                  {columnCards.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {columnCards.map((card) => (
                  <div
                    key={card.id}
                    className={cn(
                      'rounded-lg border bg-muted/20 p-3',
                      card.status === 'completed' && 'border-green-500/20'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{card.label}</p>
                      <span className="text-muted-foreground text-[10px]">{card.time}</span>
                    </div>
                    {card.meta ? (
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-[10px]">{card.meta}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
