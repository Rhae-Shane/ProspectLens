import { useEffect, useMemo, useState } from "react";

import { Building2 } from "lucide-react";

import {
  getCachedLogoUrl,
  prefetchCompanyLogo,
  setCachedLogoUrl,
} from "@/lib/company-logo-cache";
import { extractCompanyDomain, getClearbitLogoUrl, getGoogleFaviconUrl } from "@/lib/company-logo";
import { cn, getInitials } from "@/lib/utils";

const sizeClasses = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-12 text-base",
  "2xl": "size-16 text-lg",
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
  const logoUrls = useMemo(() => {
    if (!domain) return [];
    return [getClearbitLogoUrl(domain), getGoogleFaviconUrl(domain)];
  }, [domain]);

  const [logoIndex, setLogoIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const cachedUrl = domain ? getCachedLogoUrl(domain) : null;
  const currentSrc = domain ? cachedUrl ?? logoUrls[logoIndex] ?? null : null;

  useEffect(() => {
    setLogoIndex(0);
    setLoaded(Boolean(domain && getCachedLogoUrl(domain)));
  }, [domain]);

  useEffect(() => {
    if (domain) prefetchCompanyLogo(website ?? "");
  }, [domain, website]);

  const initials = getInitials(name);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
        sizeClasses[size],
        className,
      )}
      aria-hidden={!name}
    >
      <span className="absolute inset-0 flex items-center justify-center font-medium text-muted-foreground">
        {initials !== "?" ? initials : <Building2 className="size-4" />}
      </span>

      {currentSrc ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          decoding="async"
          className={cn(
            "relative z-10 size-full bg-background object-contain p-1 transition-opacity duration-150",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => {
            setLoaded(true);
            if (domain) setCachedLogoUrl(domain, currentSrc);
          }}
          onError={() => {
            setLoaded(false);
            setLogoIndex((index) => index + 1);
          }}
        />
      ) : null}
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
