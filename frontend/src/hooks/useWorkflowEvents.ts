import { useCallback, useEffect, useRef, useState } from 'react'
import { getEventStreamUrl } from '@/api/client'
import type { WorkflowEvent } from '@/types/report'

function isWorkflowTerminal(event: WorkflowEvent): boolean {
  return (
    event.node === 'workflow' &&
    (event.event_type === 'completed' || event.event_type === 'failed')
  )
}

export function useWorkflowEvents(
  sessionId: string,
  enabled: boolean,
  onTerminal?: () => void
) {
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)
  const onTerminalRef = useRef(onTerminal)
  onTerminalRef.current = onTerminal

  const reset = useCallback(() => {
    setEvents([])
    setFinished(false)
    setError(null)
    setConnected(false)
  }, [])

  useEffect(() => {
    if (!enabled || !sessionId) return

    reset()
    const source = new EventSource(getEventStreamUrl(sessionId))
    sourceRef.current = source

    source.onopen = () => {
      setConnected(true)
      setError(null)
    }

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) return
      setError('Connection lost')
      setConnected(false)
    }

    source.addEventListener('workflow_event', (e) => {
      try {
        const event = JSON.parse(e.data) as WorkflowEvent
        setEvents((prev) => {
          if (prev.some((p) => p.id === event.id)) return prev
          return [...prev, event]
        })
        if (isWorkflowTerminal(event)) {
          setFinished(true)
          source.close()
          sourceRef.current = null
          onTerminalRef.current?.()
        }
      } catch {
        /* ignore parse errors */
      }
    })

    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [sessionId, enabled, reset])

  return { events, connected, finished, error }
}
