import { Outlet } from 'react-router-dom'
import { siGithub } from 'simple-icons'

import { AppSidebar } from '@/layouts/dashboard/_components/sidebar/app-sidebar'
import { NavSessions } from '@/layouts/dashboard/_components/sidebar/nav-sessions'
import { SimpleIcon } from '@/components/simple-icon'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { users } from '@/data/users'
import { cn } from '@/lib/utils'
import { PREFERENCE_DEFAULTS } from '@/lib/preferences/preferences-config'

import { AccountSwitcher } from '@/layouts/dashboard/_components/sidebar/account-switcher'
import { LayoutControls } from '@/layouts/dashboard/_components/sidebar/layout-controls'
import { SearchDialog } from '@/layouts/dashboard/_components/sidebar/search-dialog'
import { ThemeSwitcher } from '@/layouts/dashboard/_components/sidebar/theme-switcher'

export function DashboardLayout() {
  const { sidebar_variant, sidebar_collapsible } = PREFERENCE_DEFAULTS

  return (
    <SidebarProvider
      defaultOpen
      style={{ '--sidebar-width': 'calc(var(--spacing) * 68)' } as React.CSSProperties}
    >
      <AppSidebar variant={sidebar_variant} collapsible={sidebar_collapsible} />
      <SidebarInset
        className={cn(
          '[html[data-content-layout=centered]_&>*]:mx-auto',
          '[html[data-content-layout=centered]_&>*]:w-full',
          '[html[data-content-layout=centered]_&>*]:max-w-screen-2xl',
          'peer-data-[variant=inset]:border',
          '[--dashboard-header-height:--spacing(12)]',
          'min-w-0 overflow-x-hidden'
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center" />
              <SearchDialog />
              <NavSessions />
            </div>
            <div className="flex items-center gap-2">
              <LayoutControls />
              <ThemeSwitcher />
              <Button asChild size="icon">
                <a
                  href="https://github.com/Rhae-Shane/ProspectLens"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open GitHub repository"
                >
                  <SimpleIcon icon={siGithub} className="fill-primary-foreground" />
                </a>
              </Button>
              <AccountSwitcher users={users} />
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
