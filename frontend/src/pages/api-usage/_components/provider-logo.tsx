import { useState } from 'react'

import { cn } from '@/lib/utils'

interface ProviderLogoProps {
  label: string
  website?: string
  brandColor?: string
  className?: string
}

export function ProviderLogo({ label, website, brandColor, className }: ProviderLogoProps) {
  const [failed, setFailed] = useState(false)
  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (website && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${website}&sz=128`}
        alt={`${label} logo`}
        className={cn('size-10 rounded-lg border bg-white object-contain p-1.5', className)}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid size-10 place-items-center rounded-lg border font-semibold text-white text-xs',
        className
      )}
      style={{ backgroundColor: brandColor ?? '#64748b' }}
    >
      {initials}
    </div>
  )
}
