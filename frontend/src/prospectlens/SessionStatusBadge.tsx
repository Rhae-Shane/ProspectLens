import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusStyles = {
  completed: 'border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300',
  running: 'border-blue-200 bg-blue-500/10 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/15 dark:text-blue-300',
  failed: 'border-red-200 bg-red-500/10 text-red-700 dark:border-red-900/40 dark:bg-red-500/15 dark:text-red-300',
  pending: 'border-border bg-muted text-muted-foreground',
} as const

type SessionStatus = keyof typeof statusStyles

interface Props {
  status: string
  className?: string
}

export function SessionStatusBadge({ status, className }: Props) {
  const key = (status in statusStyles ? status : 'pending') as SessionStatus

  return (
    <Badge variant="outline" className={cn('rounded-full text-xs font-medium capitalize', statusStyles[key], className)}>
      {status}
    </Badge>
  )
}
