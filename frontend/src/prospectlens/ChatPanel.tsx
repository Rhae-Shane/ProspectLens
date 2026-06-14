import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/utils'

interface Props {
  sessionId: string
  enabled: boolean
}

export function ChatPanel({ sessionId, enabled }: Props) {
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: () => api.getChatHistory(sessionId),
    enabled,
  })

  const sendMutation = useMutation({
    mutationFn: (msg: string) => api.sendChatMessage(sessionId, msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', sessionId] })
      setMessage('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sendMutation.isPending) return
    sendMutation.mutate(message.trim())
  }

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Complete the research workflow to start follow-up chat.
      </p>
    )
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading chat...</p>}
        {messages.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ask follow-up questions about the research report.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
              <p className="text-xs opacity-60 mt-1">{formatDate(msg.created_at)}</p>
            </div>
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
          </div>
        )}
      </div>
      {sendMutation.isError && (
        <p className="text-sm text-destructive mb-2">{(sendMutation.error as Error).message}</p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about the company, risks, or outreach..."
          disabled={sendMutation.isPending}
        />
        <Button type="submit" disabled={!message.trim() || sendMutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
