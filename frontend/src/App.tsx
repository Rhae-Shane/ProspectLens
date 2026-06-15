import { Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AppProviders } from '@/providers/AppProviders'

import { HomePage } from '@/pages/HomePage'
import { NewSessionPage } from '@/pages/NewSessionPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SessionsPage } from '@/pages/SessionsPage'

import AuthV2Layout from '@/pages/auth/v2/layout'
import ChatLayout from '@/pages/chat/layout'

import DefaultDashboardPage from '@/pages/dashboard/default/page'
import CrmPage from '@/pages/dashboard/crm/page'
import FinancePage from '@/pages/dashboard/finance/page'
import AnalyticsPage from '@/pages/dashboard/analytics/page'
import ProductivityPage from '@/pages/dashboard/productivity/page'
import EcommercePage from '@/pages/dashboard/ecommerce/page'
import AcademyPage from '@/pages/dashboard/academy/page'
import LogisticsPage from '@/pages/dashboard/logistics/page'
import DashboardMailPage from '@/pages/dashboard/mail/page'
import DashboardChatPage from '@/pages/dashboard/chat/page'
import ComingSoonPage from '@/pages/dashboard/coming-soon/page'
import KanbanPage from '@/pages/dashboard/kanban/page'
import InvoicePage from '@/pages/dashboard/invoice/page'
import UsersPage from '@/pages/dashboard/users/page'
import RolesPage from '@/pages/dashboard/roles/page'
import DefaultV1Page from '@/pages/dashboard/legacy/default-v1/page'
import CrmV1Page from '@/pages/dashboard/legacy/crm-v1/page'
import FinanceV1Page from '@/pages/dashboard/legacy/finance-v1/page'
import AnalyticsV1Page from '@/pages/dashboard/legacy/analytics-v1/page'

import AuthV1LoginPage from '@/pages/auth/v1/login/page'
import AuthV1RegisterPage from '@/pages/auth/v1/register/page'
import AuthV2LoginPage from '@/pages/auth/v2/login/page'
import AuthV2RegisterPage from '@/pages/auth/v2/register/page'

import MailPage from '@/pages/mail/page'
import ChatPage from '@/pages/chat/page'
import UnauthorizedPage from '@/pages/unauthorized/page'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route element={<DashboardLayout />}>
            <Route path="dashboard/default" element={<DefaultDashboardPage />} />
            <Route path="dashboard/crm" element={<CrmPage />} />
            <Route path="dashboard/finance" element={<FinancePage />} />
            <Route path="dashboard/analytics" element={<AnalyticsPage />} />
            <Route path="dashboard/productivity" element={<ProductivityPage />} />
            <Route path="dashboard/ecommerce" element={<EcommercePage />} />
            <Route path="dashboard/academy" element={<AcademyPage />} />
            <Route path="dashboard/logistics" element={<LogisticsPage />} />
            <Route path="dashboard/mail" element={<DashboardMailPage />} />
            <Route path="dashboard/chat" element={<DashboardChatPage />} />
            <Route path="dashboard/coming-soon" element={<ComingSoonPage />} />
            <Route path="dashboard/kanban" element={<KanbanPage />} />
            <Route path="dashboard/invoice" element={<InvoicePage />} />
            <Route path="dashboard/users" element={<UsersPage />} />
            <Route path="dashboard/roles" element={<RolesPage />} />
            <Route path="dashboard/default-v1" element={<DefaultV1Page />} />
            <Route path="dashboard/crm-v1" element={<CrmV1Page />} />
            <Route path="dashboard/finance-v1" element={<FinanceV1Page />} />
            <Route path="dashboard/analytics-v1" element={<AnalyticsV1Page />} />
            <Route path="dashboard/legacy/default-v1" element={<DefaultV1Page />} />
            <Route path="dashboard/legacy/crm-v1" element={<CrmV1Page />} />
            <Route path="dashboard/legacy/finance-v1" element={<FinanceV1Page />} />
            <Route path="dashboard/legacy/analytics-v1" element={<AnalyticsV1Page />} />

            <Route path="home" element={<HomePage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/new" element={<NewSessionPage />} />
            <Route path="sessions/:id" element={<SessionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:id" element={<ReportsPage />} />
          </Route>

          <Route path="auth/v1/login" element={<AuthV1LoginPage />} />
          <Route path="auth/v1/register" element={<AuthV1RegisterPage />} />
          <Route element={<AuthV2Layout />}>
            <Route path="auth/v2/login" element={<AuthV2LoginPage />} />
            <Route path="auth/v2/register" element={<AuthV2RegisterPage />} />
          </Route>

          <Route path="mail" element={<MailPage />} />
          <Route element={<ChatLayout />}>
            <Route path="chat" element={<ChatPage />} />
          </Route>

          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AppProviders>
    </QueryClientProvider>
  )
}
