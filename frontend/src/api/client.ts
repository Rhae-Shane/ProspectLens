import type { ApiKeyUsageResponse } from '@/types/api-usage'
import type {
  ChatMessage,
  ChatTool,
  CreateSessionPayload,
  Session,
  SessionListResponse,
  WorkflowCheckpoint,
  WorkflowEvent,
} from '@/types/report'

import { getAuthToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

const API_URL = import.meta.env.VITE_API_URL || ''

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
    ...options,
  })
  if (res.status === 401) {
    throw new Error('Session expired. Please sign in again.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export interface SignInResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

export const api = {
  signIn: (email: string, password: string) =>
    request<SignInResponse>('/api/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<AuthUser>('/api/v1/auth/me'),

  createSession: (data: CreateSessionPayload) =>
    request<Session>('/api/v1/sessions', { method: 'POST', body: JSON.stringify(data) }),

  listSessions: (page = 1, pageSize = 20) =>
    request<SessionListResponse>(`/api/v1/sessions?page=${page}&page_size=${pageSize}`),

  getSession: (id: string) => request<Session>(`/api/v1/sessions/${id}`),

  runWorkflow: (id: string) =>
    request<{ session_id: string; status: string; message: string }>(
      `/api/v1/sessions/${id}/run`,
      { method: 'POST' }
    ),

  retryWorkflow: (id: string) =>
    request<{ session_id: string; status: string; message: string }>(
      `/api/v1/sessions/${id}/retry`,
      { method: 'POST' }
    ),

  resumeWorkflow: (id: string) =>
    request<{ session_id: string; status: string; message: string }>(
      `/api/v1/sessions/${id}/resume`,
      { method: 'POST' }
    ),

  getWorkflowCheckpoint: (id: string) =>
    request<WorkflowCheckpoint>(`/api/v1/sessions/${id}/workflow/state`),

  getEvents: (id: string) => request<WorkflowEvent[]>(`/api/v1/sessions/${id}/events`),

  getChatHistory: (id: string) => request<ChatMessage[]>(`/api/v1/sessions/${id}/chat`),

  getChatTools: () => request<ChatTool[]>('/api/v1/chat/tools'),

  sendChatMessage: (id: string, message: string, tools?: string[]) =>
    request<ChatMessage>(`/api/v1/sessions/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, tools: tools?.length ? tools : undefined }),
    }),

  getApiKeyUsage: () => request<ApiKeyUsageResponse>('/api/v1/usage/api-keys'),
}

export function getEventStreamUrl(sessionId: string) {
  const token = getAuthToken()
  const base = `${API_URL}/api/v1/sessions/${sessionId}/events/stream`
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}
