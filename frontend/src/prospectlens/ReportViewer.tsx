import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn, formatDate } from '@/lib/utils'
import { providerColor, providerLabel } from '@/lib/source-utils'
import type { ReportContent, SourceItem } from '@/types/report'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  CATEGORY_ORDER,
  groupSourcesByCategory,
  inferSourceCategory,
} from '@/lib/source-utils'
import { ExternalLink, HelpCircle, MessageCircleQuestion, Megaphone, AlertTriangle } from 'lucide-react'

const SECTIONS: { key: keyof ReportContent; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { key: 'company_overview', label: 'Company Overview' },
  { key: 'products_services', label: 'Products & Services' },
  { key: 'target_customers', label: 'Target Customers' },
  { key: 'business_signals', label: 'Business Signals' },
  { key: 'risks_challenges', label: 'Risks & Challenges' },
  { key: 'discovery_questions', label: 'Discovery Questions', icon: MessageCircleQuestion },
  { key: 'outreach_strategy', label: 'Outreach Strategy', icon: Megaphone },
  { key: 'unknowns', label: 'Unknowns', icon: HelpCircle },
  { key: 'sources', label: 'Sources & Evidence' },
]

interface Props {
  report: ReportContent
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

function DiscoveryQuestions({ questions }: { questions: string[] }) {
  return (
    <ol className="space-y-3">
      {questions.map((question, index) => (
        <li
          key={index}
          className="flex gap-3 rounded-lg border border-border border-l-4 border-l-primary bg-muted/30 p-4"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </span>
          <p className="text-sm leading-relaxed text-foreground pt-0.5">{question}</p>
        </li>
      ))}
    </ol>
  )
}

function UnknownsList({ unknowns }: { unknowns: string[] }) {
  return (
    <div className="space-y-3">
      <Alert className="border-amber-200 bg-amber-500/10 dark:border-amber-900/40">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Validate in the meeting</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          These gaps were flagged by research quality checks or thin coverage. Use them to steer discovery.
        </AlertDescription>
      </Alert>
      <ul className="space-y-2">
        {unknowns.map((item, index) => (
          <li
            key={index}
            className="flex gap-2 rounded-lg border border-amber-200/60 bg-amber-500/5 px-3 py-2 text-sm dark:border-amber-900/30"
          >
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SourceCard({ source }: { source: SourceItem }) {
  const category = inferSourceCategory(source.url, source.title)

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          {source.title} <ExternalLink className="h-3 w-3" />
        </a>
        <Badge variant="outline" className="text-[10px]">
          {category}
        </Badge>
      </div>
      {source.snippet && (
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{source.snippet}</p>
      )}
    </li>
  )
}

function GroupedSources({ sources }: { sources: SourceItem[] }) {
  const grouped = groupSourcesByCategory(sources)
  const nonEmpty = CATEGORY_ORDER.filter((category) => grouped[category].length > 0)

  if (nonEmpty.length === 0) {
    return <p className="text-sm text-muted-foreground">No sources cited.</p>
  }

  return (
    <div className="space-y-6">
      {nonEmpty.map((category) => (
        <div key={category}>
          <h4 className="mb-2 text-sm font-semibold text-foreground">{category}</h4>
          <ul className="space-y-2">
            {grouped[category].map((source, index) => (
              <SourceCard key={`${category}-${index}`} source={source} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ReportViewer({ report }: Props) {
  const [active, setActive] = useState<string>('company_overview')

  const renderContent = (key: keyof ReportContent) => {
    const value = report[key]

    if (key === 'sources' && Array.isArray(value)) {
      return <GroupedSources sources={value as SourceItem[]} />
    }

    if (key === 'discovery_questions' && Array.isArray(value)) {
      return <DiscoveryQuestions questions={value.map(String)} />
    }

    if (key === 'unknowns' && Array.isArray(value)) {
      return <UnknownsList unknowns={value.map(String)} />
    }

    if (key === 'outreach_strategy' && typeof value === 'string') {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Channel, hook, and follow-up sequence synthesized from research signals.
          </p>
          <MarkdownBlock content={value} />
        </div>
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

    return <MarkdownBlock content={String(value ?? '')} />
  }

  const activeSection = SECTIONS.find((s) => s.key === active)

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-56 lg:flex-col">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const count =
            section.key === 'discovery_questions' && Array.isArray(report.discovery_questions)
              ? report.discovery_questions.length
              : section.key === 'unknowns' && Array.isArray(report.unknowns)
                ? report.unknowns.length
                : section.key === 'sources' && Array.isArray(report.sources)
                  ? report.sources.length
                  : null

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActive(section.key)}
              className={cn(
                'flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors',
                active === section.key
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                {section.label}
              </span>
              {count != null && count > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <h3 className="mb-3 text-lg font-semibold">{activeSection?.label}</h3>
        {renderContent(active as keyof ReportContent)}
      </div>
    </div>
  )
}
