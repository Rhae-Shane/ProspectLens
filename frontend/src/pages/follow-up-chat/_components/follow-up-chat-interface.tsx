import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  Building2,
  Check,
  ChevronDown,
  Globe,
  Link2,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Sparkles,
  User,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { api } from '@/api/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { mergeChatTools } from '@/lib/chat-tools'
import { cn } from '@/lib/utils'
import type { ChatMessage, ChatToolUsage, RagSectionRef } from '@/types/report'

const TOOL_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  building: Building2,
  newspaper: Newspaper,
  search: Search,
  sparkles: Sparkles,
  link: Link2,
}

const TOOL_ACTIVITY: Record<string, string> = {
  web_search: 'Searching the web',
  company_enrichment: 'Enriching company data',
  recent_news: 'Fetching recent news',
  search_report: 'Searching the report',
  deep_research: 'Running deep research',
  scrape_website: 'Reading website',
}

const SUGGESTIONS = [
  'What are the biggest risks for this account?',
  'Who should we target for outreach?',
  'Summarize recent business signals',
  'What discovery questions should I ask?',
]

function toolIcon(icon: string) {
  return TOOL_ICONS[icon] ?? Globe
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

function ToolTraceBlock({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/trace">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium text-muted-foreground">{title}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/trace:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 space-y-1 rounded-lg border border-border/40 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function RagRetrievalTrace({ sections }: { sections: RagSectionRef[] }) {
  if (!sections.length) return null
  return (
    <ToolTraceBlock title={`Retrieved ${sections.length} report section${sections.length === 1 ? '' : 's'}`} icon={Search}>
      <ul className="space-y-1.5">
        {sections.map((section, index) => (
          <li key={`${section.section}-${index}`} className="flex items-center justify-between gap-2">
            <span className="truncate">{section.title ?? section.section ?? 'Report section'}</span>
            {section.score != null ? (
              <span className="shrink-0 tabular-nums text-[10px] opacity-70">
                {Math.round(section.score * 100)}% match
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </ToolTraceBlock>
  )
}

function ToolsUsedTrace({
  toolsUsed,
  toolMap,
}: {
  toolsUsed: ChatToolUsage[]
  toolMap: Map<string, { label: string; icon: string }>
}) {
  if (!toolsUsed.length) return null
  return (
    <div className="space-y-1.5">
      {toolsUsed.map((usage, index) => {
        const tool = toolMap.get(usage.tool)
        const Icon = tool ? toolIcon(tool.icon) : Wrench
        const label = tool?.label ?? usage.tool
        return (
          <ToolTraceBlock
            key={`${usage.tool}-${index}`}
            title={usage.query ? `${label}: "${usage.query}"` : label}
            icon={Icon}
          >
            {usage.provider ? <p>Provider: {usage.provider}</p> : null}
            {usage.sources?.length ? (
              <ul className="mt-1 space-y-1">
                {usage.sources.slice(0, 4).map((source, i) => (
                  <li key={i} className="truncate">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {source.title || source.url}
                      </a>
                    ) : (
                      source.title
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground/80">Tool completed successfully.</p>
            )}
          </ToolTraceBlock>
        )
      })}
    </div>
  )
}

function AssistantMessage({
  content,
  ragSections,
  toolsUsed,
  toolMap,
}: {
  content: string
  ragSections: RagSectionRef[]
  toolsUsed: ChatToolUsage[]
  toolMap: Map<string, { label: string; icon: string }>
}) {
  const hasTraces = ragSections.length > 0 || toolsUsed.length > 0

  return (
    <div className="flex gap-3 py-5">
      <Avatar className="size-8 shrink-0 border-0 bg-emerald-600 text-white shadow-sm after:border-0">
        <AvatarFallback className="bg-emerald-600 text-white">
          <Sparkles className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-3">
        {hasTraces ? (
          <div className="space-y-1.5">
            <RagRetrievalTrace sections={ragSections} />
            <ToolsUsedTrace toolsUsed={toolsUsed} toolMap={toolMap} />
          </div>
        ) : null}
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

function UserMessage({ content, tools, toolMap }: { content: string; tools: string[]; toolMap: Map<string, { label: string; icon: string }> }) {
  return (
    <div className="flex justify-end py-3">
      <div className="flex max-w-[85%] gap-3">
        <div className="min-w-0 space-y-2">
          {tools.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1">
              {tools.map((toolId) => {
                const tool = toolMap.get(toolId)
                const Icon = tool ? toolIcon(tool.icon) : Wrench
                return (
                  <span
                    key={toolId}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <Icon className="size-3" />
                    {tool?.label ?? toolId}
                  </span>
                )
              })}
            </div>
          ) : null}
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground text-sm leading-relaxed shadow-sm">
            {content}
          </div>
        </div>
        <Avatar className="size-8 shrink-0 after:border-0">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}

function LoadingAssistant({
  pendingTools,
  toolMap,
}: {
  pendingTools: string[]
  toolMap: Map<string, { label: string; icon: string }>
}) {
  const steps =
    pendingTools.length > 0
      ? pendingTools.map((id) => TOOL_ACTIVITY[id] ?? toolMap.get(id)?.label ?? 'Running tool')
      : ['Retrieving from report', 'Thinking']

  return (
    <div className="flex gap-3 py-5">
      <Avatar className="size-8 shrink-0 border-0 bg-emerald-600 text-white after:border-0">
        <AvatarFallback className="bg-emerald-600 text-white">
          <Sparkles className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={`${step}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
            >
              <Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-600" />
              <span>{step}</span>
              {index === steps.length - 1 ? <ThinkingDots /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface FollowUpChatInterfaceProps {
  sessionId: string
  companyName: string
  className?: string
}

export function FollowUpChatInterface({ sessionId, companyName, className }: FollowUpChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [toolsOpen, setToolsOpen] = useState(false)
  const [pendingUserText, setPendingUserText] = useState<string | null>(null)
  const [pendingTools, setPendingTools] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: apiTools } = useQuery({
    queryKey: ['chat-tools', 'v3'],
    queryFn: () => api.getChatTools(),
    staleTime: 5 * 60 * 1000,
  })

  const availableTools = useMemo(() => mergeChatTools(apiTools), [apiTools])
  const toolMap = useMemo(
    () => new Map(availableTools.map((tool) => [tool.id, tool])),
    [availableTools]
  )

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: () => api.getChatHistory(sessionId),
  })

  const sendMutation = useMutation({
    mutationFn: (payload: { message: string; tools: string[] }) =>
      api.sendChatMessage(sessionId, payload.message, payload.tools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', sessionId] })
      setMessage('')
      setSelectedTools([])
      setPendingUserText(null)
      setPendingTools([])
    },
    onError: () => {
      setPendingUserText(null)
      setPendingTools([])
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sendMutation.isPending, pendingUserText])

  function toggleTool(toolId: string) {
    setSelectedTools((current) =>
      current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId]
    )
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const text = message.trim()
    if (!text || sendMutation.isPending) return
    setPendingUserText(text)
    setPendingTools([...selectedTools])
    sendMutation.mutate({ message: text, tools: selectedTools })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const showEmpty = messages.length === 0 && !isLoading && !sendMutation.isPending

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading conversation...
            </div>
          ) : null}

          {showEmpty ? (
            <div className="flex min-h-[min(100%,20rem)] flex-col items-center justify-center px-2 py-8 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-semibold text-base">Ask about {companyName}</h3>
              <p className="mt-1.5 max-w-md text-muted-foreground text-sm leading-relaxed">
                Search the briefing, enrich data, fetch news, or search the web.
              </p>
              <div className="mt-4 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setMessage(suggestion)}
                    className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg: ChatMessage) => {
            const toolsUsed = msg.metadata?.tools_used ?? []
            const userTools = msg.metadata?.tools ?? []
            const ragSections = msg.metadata?.rag_sections ?? []

            if (msg.role === 'user') {
              return (
                <UserMessage key={msg.id} content={msg.content} tools={userTools} toolMap={toolMap} />
              )
            }

            return (
              <AssistantMessage
                key={msg.id}
                content={msg.content}
                ragSections={ragSections}
                toolsUsed={toolsUsed}
                toolMap={toolMap}
              />
            )
          })}

          {pendingUserText ? (
            <UserMessage content={pendingUserText} tools={pendingTools} toolMap={toolMap} />
          ) : null}

          {sendMutation.isPending ? (
            <LoadingAssistant pendingTools={pendingTools} toolMap={toolMap} />
          ) : null}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {sendMutation.isError ? (
            <p className="mb-2 text-center text-destructive text-sm">
              {(sendMutation.error as Error).message}
            </p>
          ) : null}

          <div className="rounded-[1.75rem] border border-border/70 bg-muted/30 p-2 shadow-sm dark:bg-muted/20">
            {selectedTools.length > 0 ? (
              <div className="mb-1 flex flex-wrap gap-1.5 px-1 pt-1">
                {selectedTools.map((toolId) => {
                  const tool = toolMap.get(toolId)
                  const Icon = tool ? toolIcon(tool.icon) : Wrench
                  return (
                    <span
                      key={toolId}
                      className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs ring-1 ring-border/60"
                    >
                      <Icon className="size-3 text-muted-foreground" />
                      {tool?.label ?? toolId}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() => toggleTool(toolId)}
                        aria-label={`Remove ${tool?.label ?? toolId}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            ) : null}

            <div className="flex items-end gap-1">
              <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-full hover:bg-background/60"
                    aria-label="Add tools"
                  >
                    <Plus className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={12}
                  className="w-64 rounded-2xl border-border/80 p-1.5 shadow-xl"
                >
                  <p className="px-2.5 py-1.5 font-medium text-muted-foreground text-xs">Tools</p>
                  <div className="space-y-0.5">
                    {availableTools.map((tool) => {
                      const Icon = toolIcon(tool.icon)
                      const checked = selectedTools.includes(tool.id)
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => toggleTool(tool.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-muted/80',
                            checked && 'bg-muted/60'
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{tool.label}</span>
                          {checked ? <Check className="size-4 shrink-0 text-emerald-600" /> : null}
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                disabled={sendMutation.isPending}
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-0 py-2.5 shadow-none focus-visible:ring-0"
              />

              <Button
                type="button"
                size="icon"
                disabled={!message.trim() || sendMutation.isPending}
                onClick={() => handleSubmit()}
                className={cn(
                  'mb-0.5 size-9 shrink-0 rounded-full transition-all',
                  message.trim()
                    ? 'bg-foreground text-background hover:bg-foreground/90'
                    : 'bg-muted text-muted-foreground'
                )}
                aria-label="Send message"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            ProspectLens can make mistakes. Verify important facts before your meeting.
          </p>
        </div>
      </div>
    </div>
  )
}
