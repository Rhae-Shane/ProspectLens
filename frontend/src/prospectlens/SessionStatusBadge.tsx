import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  completed: {
    className:
      'border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300',
    icon: CheckCircle2,
    spin: false,
  },
  running: {
    className:
      'border-blue-200 bg-blue-500/10 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/15 dark:text-blue-300',
    icon: Loader2,
    spin: true,
  },
  failed: {
    className:
      'border-red-200 bg-red-500/10 text-red-700 dark:border-red-900/40 dark:bg-red-500/15 dark:text-red-300',
    icon: XCircle,
    spin: false,
  },
  pending: {
    className: 'border-border bg-muted text-muted-foreground',
    icon: Clock3,
    spin: false,
  },
} as const

type SessionStatus = keyof typeof statusConfig

interface Props {
  status: string
  className?: string
}

export function SessionStatusBadge({ status, className }: Props) {
  const key = (status in statusConfig ? status : 'pending') as SessionStatus
  const config = statusConfig[key]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 rounded-full text-xs font-medium capitalize', config.className, className)}
    >
      <Icon className={cn('size-3', config.spin && 'animate-spin')} />
      {status}
    </Badge>
  )
}
