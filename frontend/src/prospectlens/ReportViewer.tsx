import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { ReportContent } from '@/types/report'
import { ExternalLink } from 'lucide-react'

const SECTIONS: { key: keyof ReportContent; label: string; isList?: boolean }[] = [
  { key: 'company_overview', label: 'Company Overview' },
  { key: 'products_services', label: 'Products & Services' },
  { key: 'target_customers', label: 'Target Customers' },
  { key: 'business_signals', label: 'Business Signals' },
  { key: 'risks_challenges', label: 'Risks & Challenges' },
  { key: 'discovery_questions', label: 'Discovery Questions', isList: true },
  { key: 'outreach_strategy', label: 'Outreach Strategy' },
  { key: 'unknowns', label: 'Unknowns', isList: true },
  { key: 'sources', label: 'Sources' },
]

interface Props {
  report: ReportContent
}

export function ReportViewer({ report }: Props) {
  const [active, setActive] = useState<string>('company_overview')

  const renderContent = (key: keyof ReportContent) => {
    const value = report[key]
    if (key === 'sources' && Array.isArray(value)) {
      return (
        <ul className="space-y-3">
          {value.map((src, i) => (
            <li key={i} className="rounded-lg border border-border p-3">
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                {src.title} <ExternalLink className="h-3 w-3" />
              </a>
              {src.snippet && <p className="text-sm text-muted-foreground mt-1">{src.snippet}</p>}
            </li>
          ))}
        </ul>
      )
    }
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside space-y-1 text-foreground">
          {value.map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      )
    }
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
        <ReactMarkdown>{String(value)}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-1 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={cn(
              'text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
              active === s.key
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold mb-3">
          {SECTIONS.find((s) => s.key === active)?.label}
        </h3>
        {renderContent(active as keyof ReportContent)}
      </div>
    </div>
  )
}
