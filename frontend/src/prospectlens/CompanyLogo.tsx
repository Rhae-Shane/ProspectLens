import { useEffect, useMemo, useState } from "react";

import { Building2 } from "lucide-react";

import { cn, getInitials } from "@/lib/utils";
import { extractCompanyDomain, getClearbitLogoUrl, getGoogleFaviconUrl } from "@/lib/company-logo";

const sizeClasses = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-12 text-base",
} as const;

type CompanyLogoSize = keyof typeof sizeClasses;

interface CompanyLogoProps {
  name: string;
  website?: string;
  size?: CompanyLogoSize;
  className?: string;
}

export function CompanyLogo({ name, website, size = "md", className }: CompanyLogoProps) {
  const domain = useMemo(() => extractCompanyDomain(website ?? ""), [website]);
  const [logoIndex, setLogoIndex] = useState(0);

  const logoUrls = useMemo(() => {
    if (!domain) return [];
    return [getClearbitLogoUrl(domain), getGoogleFaviconUrl(domain)];
  }, [domain]);

  useEffect(() => {
    setLogoIndex(0);
  }, [domain]);

  const showImage = domain && logoIndex < logoUrls.length;
  const currentSrc = showImage ? logoUrls[logoIndex] : null;

  if (currentSrc) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background",
          sizeClasses[size],
          className,
        )}
      >
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          className="size-full object-contain p-1"
          loading="lazy"
          onError={() => setLogoIndex((index) => index + 1)}
        />
      </span>
    );
  }

  const initials = getInitials(name);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-muted font-medium text-muted-foreground",
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {initials !== "?" ? initials : <Building2 className="size-4" />}
    </span>
  );
}

interface CompanyIdentityProps {
  name: string;
  website?: string;
  size?: CompanyLogoSize;
  showWebsite?: boolean;
  nameClassName?: string;
  websiteClassName?: string;
  className?: string;
}

export function CompanyIdentity({
  name,
  website,
  size = "md",
  showWebsite = false,
  nameClassName,
  websiteClassName,
  className,
}: CompanyIdentityProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <CompanyLogo name={name} website={website} size={size} />
      <div className="min-w-0">
        <div className={cn("truncate font-medium text-sm leading-none", nameClassName)}>{name}</div>
        {showWebsite && website ? (
          <div className={cn("mt-1 truncate text-muted-foreground text-xs leading-none", websiteClassName)}>
            {website}
          </div>
        ) : null}
      </div>
    </div>
  );
}
