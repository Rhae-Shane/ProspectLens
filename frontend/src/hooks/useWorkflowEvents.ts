import { useEffect, useRef, useState } from 'react'
import { getEventStreamUrl } from '@/api/client'
import type { WorkflowEvent } from '@/types/report'

export function useWorkflowEvents(sessionId: string, enabled: boolean) {
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !sessionId) return

    const url = getEventStreamUrl(sessionId)
    const source = new EventSource(url)
    sourceRef.current = source

    source.onopen = () => setConnected(true)
    source.onerror = () => {
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
      } catch {
        /* ignore parse errors */
      }
    })

    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [sessionId, enabled])

  return { events, connected, error }
}
