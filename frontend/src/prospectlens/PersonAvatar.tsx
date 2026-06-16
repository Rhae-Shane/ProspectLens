import { useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getPersonAvatarUrls } from '@/lib/entity-logo'
import { getStakeholderInitials } from '@/lib/structured-report-utils'
import { cn } from '@/lib/utils'

interface PersonAvatarProps {
  name: string
  linkedinUrl?: string
  className?: string
  fallbackClassName?: string
}

export function PersonAvatar({ name, linkedinUrl, className, fallbackClassName }: PersonAvatarProps) {
  const avatarUrls = useMemo(() => getPersonAvatarUrls(name, linkedinUrl), [name, linkedinUrl])
  const [urlIndex, setUrlIndex] = useState(0)
  const currentSrc = avatarUrls[urlIndex]

  return (
    <Avatar className={cn('size-10', className)}>
      {currentSrc ? (
        <AvatarImage
          src={currentSrc}
          alt={name}
          onError={() => setUrlIndex((index) => index + 1)}
        />
      ) : null}
      <AvatarFallback className={cn('bg-primary/10 text-primary', fallbackClassName)}>
        {getStakeholderInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
