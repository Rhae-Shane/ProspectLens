import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PREFERENCE_DEFAULTS } from '@/lib/preferences/preferences-config'
import { ThemeBootScript } from '@/scripts/theme-boot'
import { PreferencesStoreProvider } from '@/stores/preferences/preferences-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  const { theme_mode, theme_preset, content_layout, navbar_style, font } = PREFERENCE_DEFAULTS

  return (
    <>
      <ThemeBootScript />
      <TooltipProvider>
        <PreferencesStoreProvider
          themeMode={theme_mode}
          themePreset={theme_preset}
          contentLayout={content_layout}
          navbarStyle={navbar_style}
          font={font}
        >
          {children}
          <Toaster />
        </PreferencesStoreProvider>
      </TooltipProvider>
    </>
  )
}
