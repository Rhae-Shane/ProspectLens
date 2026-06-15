import { useQuery } from '@tanstack/react-query'
import { ExternalLink, KeyRound, Loader2 } from 'lucide-react'

import { api } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCost } from '@/lib/utils'
import type { ApiKeyProviderUsage } from '@/types/api-usage'

import { ProviderLogo } from './_components/provider-logo'

function ProviderUsageCard({ provider }: { provider: ApiKeyProviderUsage }) {
  const hasFreeAllowance = provider.free_allowance_usd > 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-start gap-4">
          <ProviderLogo
            label={provider.label}
            website={provider.website}
            brandColor={provider.brand_color}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{provider.label}</CardTitle>
              <Badge
                variant="outline"
                className={
                  provider.configured
                    ? 'border-green-200 bg-green-500/10 text-green-700 dark:text-green-300'
                    : 'text-muted-foreground'
                }
              >
                {provider.configured ? 'Active' : 'Not configured'}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {provider.plan_label}
              </Badge>
            </div>
            <CardDescription>{provider.description}</CardDescription>
            {provider.website ? (
              <a
                href={`https://${provider.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
              >
                {provider.website}
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="rounded-lg border bg-muted/10 p-3">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Free allowance</p>
          <p className="mt-1 text-sm">{provider.free_allowance_label}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Free usage consumed</span>
            <span className="font-medium">
              {hasFreeAllowance
                ? `${formatCost(provider.used_usd)} of ${formatCost(provider.free_allowance_usd)}`
                : formatCost(provider.used_usd)}
            </span>
          </div>
          <Progress value={hasFreeAllowance ? provider.usage_percent : 0} className="h-2" />
          <div className="flex items-center justify-between gap-3 text-muted-foreground text-xs">
            <span>{provider.tokens_used.toLocaleString()} tokens used in ProspectLens</span>
            <span>
              {hasFreeAllowance
                ? `${formatCost(provider.credits_left_usd)} free left`
                : 'Usage tracked only'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <KeyRound className="size-3.5" />
            API key
          </span>
          <span className="font-mono text-xs">
            {provider.configured ? provider.key_hint ?? 'Configured' : 'Add key in .env'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ApiUsagePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['api-key-usage'],
    queryFn: () => api.getApiKeyUsage(),
    refetchInterval: 60_000,
  })

  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-medium text-3xl leading-none tracking-tight">API Usage</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Track free-tier usage across the providers powering ProspectLens research, reports, and follow-up chat.
          Usage is estimated from workflow runs and chat tool calls in this workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading API usage...
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Unable to load API usage. Make sure the backend is running.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{data.summary.plan_label}</CardDescription>
                <CardTitle className="text-2xl">{formatCost(data.summary.total_credits_left_usd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">Free credits remaining (estimated)</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Used so far</CardDescription>
                <CardTitle className="text-2xl">{formatCost(data.summary.total_used_usd)}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                of {formatCost(data.summary.total_free_allowance_usd)} free allowance
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active API keys</CardDescription>
                <CardTitle className="text-2xl">
                  {data.summary.configured_count}/{data.summary.provider_count}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">Providers configured in your environment</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.providers.map((provider) => (
              <ProviderUsageCard key={provider.id} provider={provider} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
