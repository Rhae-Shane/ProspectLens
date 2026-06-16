import { SessionsWorkspace } from '@/pages/sessions/_components/sessions-workspace'

export function SessionsPage() {
  return (
    <div
      data-content-padding="false"
      className="flex h-full min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden"
    >
      <SessionsWorkspace />
    </div>
  )
}
