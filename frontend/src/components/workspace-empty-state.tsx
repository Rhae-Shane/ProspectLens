import type { LucideIcon } from 'lucide-react'

interface WorkspaceEmptyStateProps {
  icon: LucideIcon
  navLabel: string
  contentLabel?: string
}

export function WorkspaceEmptyState({ icon: Icon, navLabel, contentLabel }: WorkspaceEmptyStateProps) {
  const mainLabel = contentLabel ?? navLabel

  return (
    <div className="grid h-full min-h-0 overflow-hidden lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:divide-x">
      <aside className="flex min-h-0 flex-col items-center justify-center border-b bg-muted/20 p-8 lg:border-b-0">
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <div className="grid size-16 place-items-center rounded-full border border-dashed bg-muted/30">
            <Icon className="size-7 opacity-50" strokeWidth={1.25} />
          </div>
          <p className="text-sm">{navLabel}</p>
        </div>
      </aside>
      <main className="grid place-items-center p-8">
        <p className="text-muted-foreground text-sm">{mainLabel}</p>
      </main>
    </div>
  )
}
