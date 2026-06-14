import { useState } from 'react'
import { ChevronDown, ChevronUp, Activity } from 'lucide-react'
import type { WorkflowEvent } from '@/types/report'
import { formatCost, formatDate } from '@/lib/utils'

interface Props {
  events: WorkflowEvent[]
  totalTokens: number
  totalCost: number
}

export function WorkflowTrace({ events, totalTokens, totalCost }: Props) {
  const [open, setOpen] = useState(false)

  const nodeEvents = events.filter((e) => e.node !== 'workflow')

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Activity className="h-4 w-4" />
          Workflow Trace
          <span className="text-gray-400 font-normal">
            ({nodeEvents.length} events · {totalTokens.toLocaleString()} tokens · {formatCost(totalCost)})
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
          {nodeEvents.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">No events yet.</p>
          )}
          {nodeEvents.map((event) => (
            <div key={event.id} className="px-4 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">
                  {event.node.replace('_', ' ')}
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      event.event_type === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : event.event_type === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : event.event_type === 'started'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {event.event_type}
                  </span>
                </span>
                <span className="text-xs text-gray-400">{formatDate(event.created_at)}</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                {event.duration_ms > 0 && <span>{event.duration_ms}ms</span>}
                {event.tokens > 0 && <span>{event.tokens} tokens</span>}
                {event.cost_usd > 0 && <span>{formatCost(event.cost_usd)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
