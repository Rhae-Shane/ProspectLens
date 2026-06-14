import { Link, Outlet, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: 'Home' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/sessions/new', label: 'New Research' },
]

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
              <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                <Search className="h-4 w-4" />
              </div>
              ProspectLens
            </Link>
            <nav className="flex gap-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.to
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        ProspectLens — AI Research Copilot · Powered by LangGraph
      </footer>
    </div>
  )
}
