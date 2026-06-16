import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Globe,
  Link2,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { api } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CHAT_TOOLS, mergeChatTools } from '@/lib/chat-tools'
import { cn, formatDate } from '@/lib/utils'

const TOOL_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  building: Building2,
  newspaper: Newspaper,
  search: Search,
  sparkles: Sparkles,
  link: Link2,
}

function toolIcon(icon: string) {
  return TOOL_ICONS[icon] ?? Globe
}

const EXTERNAL_TOOLS = new Set([
  'web_search',
  'company_enrichment',
  'recent_news',
  'deep_research',
  'scrape_website',
])

interface Props {
  sessionId: string
  enabled: boolean
  fullHeight?: boolean
}

export function ChatPanel({ sessionId, enabled, fullHeight = false }: Props) {
  const [message, setMessage] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [toolsOpen, setToolsOpen] = useState(false)
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
    enabled,
  })

  const sendMutation = useMutation({
    mutationFn: (payload: { message: string; tools: string[] }) =>
      api.sendChatMessage(sessionId, payload.message, payload.tools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', sessionId] })
      setMessage('')
      setSelectedTools([])
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sendMutation.isPending) return
    sendMutation.mutate({ message: message.trim(), tools: selectedTools })
  }

  function toggleTool(toolId: string) {
    setSelectedTools((current) =>
      current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId]
    )
  }

  if (!enabled) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        Complete the research workflow to start follow-up chat.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col', fullHeight ? 'h-full min-h-0' : 'h-[400px]')}>
      <div className="mb-4 flex-1 space-y-4 overflow-y-auto">
        {isLoading && <p className="text-muted-foreground text-sm">Loading chat...</p>}
        {messages.length === 0 && !isLoading && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            Ask follow-up questions about the research report. The assistant can search the briefing,
            enrich company data, fetch news, or search the web automatically.
          </p>
        )}
        {messages.map((msg) => {
          const toolsUsed = msg.metadata?.tools_used ?? []
          const userTools = msg.metadata?.tools ?? []
          const ragSections = msg.metadata?.rag_sections ?? []

          return (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-4 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {msg.role === 'user' && userTools.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {userTools.map((toolId) => {
                      const tool = toolMap.get(toolId)
                      const Icon = tool ? toolIcon(tool.icon) : Globe
                      return (
                        <Badge
                          key={toolId}
                          variant="secondary"
                          className="gap-1 border-primary-foreground/20 bg-primary-foreground/10 text-[10px] text-primary-foreground"
                        >
                          <Icon className="size-3" />
                          {tool?.label ?? toolId}
                        </Badge>
                      )
                    })}
                  </div>
                ) : null}

                {msg.role === 'assistant' && ragSections.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {ragSections.map((section, index) => (
                      <Badge key={`${section.section}-${index}`} variant="secondary" className="gap-1 text-[10px]">
                        <Search className="size-3" />
                        {section.title ?? section.section}
                        {section.score ? ` (${Math.round(section.score * 100)}%)` : null}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {msg.role === 'assistant' && toolsUsed.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {toolsUsed.map((usage, index) => {
                      const tool = toolMap.get(usage.tool)
                      const Icon = tool ? toolIcon(tool.icon) : Globe
                      return (
                        <Badge key={`${usage.tool}-${index}`} variant="outline" className="gap-1 text-[10px]">
                          <Icon className="size-3" />
                          {tool?.label ?? usage.tool}
                          {usage.query ? `: ${usage.query}` : null}
                        </Badge>
                      )
                    })}
                  </div>
                ) : null}

                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
                <p className="mt-1 text-xs opacity-60">{formatDate(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        {sendMutation.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            {selectedTools.some((tool) => EXTERNAL_TOOLS.has(tool))
              ? 'Running tools...'
              : 'Thinking...'}
          </div>
        )}
      </div>

      {sendMutation.isError && (
        <p className="mb-2 text-destructive text-sm">{(sendMutation.error as Error).message}</p>
      )}

      {selectedTools.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedTools.map((toolId) => {
            const tool = toolMap.get(toolId)
            const Icon = tool ? toolIcon(tool.icon) : Globe
            return (
              <Badge key={toolId} variant="secondary" className="gap-1 pr-1 text-xs">
                <Icon className="size-3" />
                {tool?.label ?? toolId}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  onClick={() => toggleTool(toolId)}
                  aria-label={`Remove ${tool?.label ?? toolId}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Add tools">
              <Plus className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <p className="mb-2 font-medium text-sm">Tools</p>
            <p className="mb-3 text-muted-foreground text-xs">
              Add tools for this message. The assistant can also use them automatically when needed.
            </p>
            <ScrollArea className="h-72 pr-2">
              <div className="space-y-2">
                {availableTools.map((tool) => {
                  const Icon = toolIcon(tool.icon)
                  const checked = selectedTools.includes(tool.id)
                  return (
                    <div
                      key={tool.id}
                      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40"
                    >
                      <Checkbox
                        id={`tool-${tool.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`tool-${tool.id}`} className="flex items-center gap-1.5 text-sm">
                          <Icon className="size-3.5" />
                          {tool.label}
                        </Label>
                        <p className="mt-0.5 text-muted-foreground text-xs">{tool.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about revenue, risks, outreach..."
          disabled={sendMutation.isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={!message.trim() || sendMutation.isPending}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
