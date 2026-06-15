import { useMemo, useState } from 'react'
import { Briefcase, Handshake } from 'lucide-react'

import { getEntityLogoUrls } from '@/lib/entity-logo'
import { cn, getInitials } from '@/lib/utils'

const sizeClasses = {
  sm: 'size-6 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-10 text-sm',
} as const

type EntityLogoSize = keyof typeof sizeClasses

interface EntityLogoProps {
  name: string
  website?: string
  type?: 'investor' | 'partner' | 'board'
  size?: EntityLogoSize
  className?: string
  rounded?: 'md' | 'full'
}

export function EntityLogo({
  name,
  website,
  type = 'investor',
  size = 'md',
  className,
  rounded = 'md',
}: EntityLogoProps) {
  const logoUrls = useMemo(() => getEntityLogoUrls(name, website), [name, website])
  const [logoIndex, setLogoIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const currentSrc = logoUrls[logoIndex] ?? null
  const Icon = type === 'partner' ? Handshake : Briefcase
  const initials = getInitials(name)

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden border bg-muted',
        rounded === 'full' ? 'rounded-full' : 'rounded-lg',
        sizeClasses[size],
        className
      )}
    >
      <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        {initials !== '?' ? (
          <span className="font-medium">{initials}</span>
        ) : (
          <Icon className="size-4" />
        )}
      </span>

      {currentSrc ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          decoding="async"
          className={cn(
            'relative z-10 size-full bg-background object-contain p-1 transition-opacity duration-150',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false)
            setLogoIndex((index) => index + 1)
          }}
        />
      ) : null}
    </span>
  )
}
