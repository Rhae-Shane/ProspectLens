import type { FontKey } from '@/lib/fonts/registry'
import { getClientCookie } from '@/lib/cookie.client'
import { fontRegistry } from '@/lib/fonts/registry'

import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
  type ContentLayout,
  type NavbarStyle,
  type SidebarCollapsible,
  type SidebarVariant,
} from './layout'
import {
  applyContentLayout,
  applyFont,
  applyNavbarStyle,
  applySidebarCollapsible,
  applySidebarVariant,
} from './layout-utils'
import { PREFERENCE_DEFAULTS, type PreferenceValueMap } from './preferences-config'
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemeMode, type ThemePreset } from './theme'
import { applyThemeMode, applyThemePreset } from './theme-utils'

const FONT_VALUES = Object.keys(fontRegistry) as FontKey[]

function getSafeValue<T extends string>(raw: string | undefined, allowed: readonly T[], fallback: T): T {
  if (raw && allowed.includes(raw as T)) return raw as T
  return fallback
}

function readCookiePreference(key: keyof PreferenceValueMap): string | undefined {
  return getClientCookie(key)
}

export function readStoredPreferences(): PreferenceValueMap {
  return {
    theme_mode: getSafeValue(readCookiePreference('theme_mode'), THEME_MODE_VALUES, PREFERENCE_DEFAULTS.theme_mode),
    theme_preset: getSafeValue(
      readCookiePreference('theme_preset'),
      THEME_PRESET_VALUES,
      PREFERENCE_DEFAULTS.theme_preset
    ),
    font: getSafeValue(readCookiePreference('font'), FONT_VALUES, PREFERENCE_DEFAULTS.font),
    content_layout: getSafeValue(
      readCookiePreference('content_layout'),
      CONTENT_LAYOUT_VALUES,
      PREFERENCE_DEFAULTS.content_layout
    ),
    navbar_style: getSafeValue(
      readCookiePreference('navbar_style'),
      NAVBAR_STYLE_VALUES,
      PREFERENCE_DEFAULTS.navbar_style
    ),
    sidebar_variant: getSafeValue(
      readCookiePreference('sidebar_variant'),
      SIDEBAR_VARIANT_VALUES,
      PREFERENCE_DEFAULTS.sidebar_variant
    ),
    sidebar_collapsible: getSafeValue(
      readCookiePreference('sidebar_collapsible'),
      SIDEBAR_COLLAPSIBLE_VALUES,
      PREFERENCE_DEFAULTS.sidebar_collapsible
    ),
  }
}

export function readPreferencesFromDom(): Partial<PreferenceValueMap> {
  const root = document.documentElement
  return {
    theme_mode: getSafeValue(root.getAttribute('data-theme-mode') ?? undefined, THEME_MODE_VALUES, PREFERENCE_DEFAULTS.theme_mode),
    theme_preset: getSafeValue(
      root.getAttribute('data-theme-preset') ?? undefined,
      THEME_PRESET_VALUES,
      PREFERENCE_DEFAULTS.theme_preset
    ),
    font: getSafeValue(root.getAttribute('data-font') ?? undefined, FONT_VALUES, PREFERENCE_DEFAULTS.font),
    content_layout: getSafeValue(
      root.getAttribute('data-content-layout') ?? undefined,
      CONTENT_LAYOUT_VALUES,
      PREFERENCE_DEFAULTS.content_layout
    ),
    navbar_style: getSafeValue(
      root.getAttribute('data-navbar-style') ?? undefined,
      NAVBAR_STYLE_VALUES,
      PREFERENCE_DEFAULTS.navbar_style
    ),
    sidebar_variant: getSafeValue(
      root.getAttribute('data-sidebar-variant') ?? undefined,
      SIDEBAR_VARIANT_VALUES,
      PREFERENCE_DEFAULTS.sidebar_variant
    ),
    sidebar_collapsible: getSafeValue(
      root.getAttribute('data-sidebar-collapsible') ?? undefined,
      SIDEBAR_COLLAPSIBLE_VALUES,
      PREFERENCE_DEFAULTS.sidebar_collapsible
    ),
  }
}

/** Re-apply layout + theme attrs (e.g. after reading cookies in React). */
export function applyStoredPreferences(prefs: PreferenceValueMap) {
  applyThemeMode(prefs.theme_mode as ThemeMode)
  applyThemePreset(prefs.theme_preset as ThemePreset)
  applyFont(prefs.font)
  applyContentLayout(prefs.content_layout as ContentLayout)
  applyNavbarStyle(prefs.navbar_style as NavbarStyle)
  applySidebarVariant(prefs.sidebar_variant as SidebarVariant)
  applySidebarCollapsible(prefs.sidebar_collapsible as SidebarCollapsible)
}
