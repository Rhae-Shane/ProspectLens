import { Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AppProviders } from '@/providers/AppProviders'

import { HomePage } from '@/pages/HomePage'
import { NewSessionPage } from '@/pages/NewSessionPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ReportBriefingPage } from '@/pages/ReportBriefingPage'
import { FollowUpChatPage } from '@/pages/FollowUpChatPage'
import { ApiUsagePage } from '@/pages/api-usage/page'
import { SessionsPage } from '@/pages/SessionsPage'
import LoginPage from '@/pages/login/page'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="home" element={<HomePage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="sessions/new" element={<NewSessionPage />} />
              <Route path="sessions/:id" element={<SessionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/:id" element={<ReportsPage />} />
              <Route path="reports/:id/briefing" element={<ReportBriefingPage />} />
              <Route path="follow-up-chat" element={<FollowUpChatPage />} />
              <Route path="follow-up-chat/:id" element={<FollowUpChatPage />} />
              <Route path="api-usage" element={<ApiUsagePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AppProviders>
    </QueryClientProvider>
  )
}
