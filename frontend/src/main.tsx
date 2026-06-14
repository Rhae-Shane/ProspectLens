import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '@/lib/fonts/fonts.css'
import './index.css'
import { PREFERENCE_DEFAULTS } from '@/lib/preferences/preferences-config'

const root = document.documentElement
const d = PREFERENCE_DEFAULTS
root.setAttribute('data-theme-mode', d.theme_mode)
root.setAttribute('data-theme-preset', d.theme_preset)
root.setAttribute('data-content-layout', d.content_layout)
root.setAttribute('data-navbar-style', d.navbar_style)
root.setAttribute('data-sidebar-variant', d.sidebar_variant)
root.setAttribute('data-sidebar-collapsible', d.sidebar_collapsible)
root.setAttribute('data-font', d.font)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
