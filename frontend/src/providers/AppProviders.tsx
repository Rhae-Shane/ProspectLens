import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { readPreferencesFromDom } from '@/lib/preferences/bootstrap-preferences'
import { PreferencesStoreProvider } from '@/stores/preferences/preferences-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  const prefs = readPreferencesFromDom()

  return (
    <TooltipProvider>
      <PreferencesStoreProvider
        themeMode={prefs.theme_mode!}
        themePreset={prefs.theme_preset!}
        contentLayout={prefs.content_layout!}
        navbarStyle={prefs.navbar_style!}
        font={prefs.font!}
        sidebarVariant={prefs.sidebar_variant!}
        sidebarCollapsible={prefs.sidebar_collapsible!}
      >
        {children}
        <Toaster />
      </PreferencesStoreProvider>
    </TooltipProvider>
  )
}
