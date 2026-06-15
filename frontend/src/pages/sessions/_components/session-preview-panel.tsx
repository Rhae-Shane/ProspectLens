import {
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/prospectlens/CompanyLogo";

const WORKFLOW_STEPS = [
  { label: "Planner", description: "Breaks your objective into a research plan" },
  { label: "Research", description: "Gathers live company intelligence" },
  { label: "Analysis", description: "Synthesizes findings into insights" },
  { label: "Quality Check", description: "Validates coverage and accuracy" },
  { label: "Report", description: "Generates your meeting briefing" },
] as const;

interface SessionPreviewPanelProps {
  companyName: string;
  website: string;
  objective: string;
}

export function SessionPreviewPanel({ companyName, website, objective }: SessionPreviewPanelProps) {
  const hasCompany = Boolean(companyName.trim() || website.trim());
  const displayName = companyName.trim() || "Your company";
  const objectivePreview = objective.trim() || "Your research objective will appear here as you type.";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="leading-none">Live Preview</CardTitle>
          <CardDescription>See how this session will appear in your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            {hasCompany ? (
              <div className="flex items-start gap-4">
                <CompanyLogo name={displayName} website={website} size="2xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lg leading-tight">{displayName}</p>
                  {website.trim() ? (
                    <p className="mt-1 flex items-center gap-1.5 truncate text-muted-foreground text-sm">
                      <Globe className="size-3.5 shrink-0" />
                      {website}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground text-sm">Add a website to fetch the company logo</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <span className="flex size-16 items-center justify-center rounded-xl border bg-muted">
                  <Building2 className="size-7 text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium">Company preview</p>
                  <p className="mt-1 text-muted-foreground text-sm">Enter a company name and website to preview branding.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <p className="font-medium text-sm">Research objective</p>
            </div>
            <p className="rounded-lg border bg-background p-3 text-muted-foreground text-sm leading-relaxed">
              {objectivePreview}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="leading-none">What happens next</CardTitle>
          <CardDescription>ProspectLens runs a multi-step LangGraph workflow automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground text-xs font-medium">
                  {index + 1}
                </span>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <span className="mt-1 h-full w-px bg-border" />
                ) : null}
              </div>
              <div className="pb-3">
                <p className="font-medium text-sm">{step.label}</p>
                <p className="text-muted-foreground text-xs">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 pt-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium text-sm">Tip for better briefings</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Mention the meeting type, your role, and what you need to learn. Specific objectives produce sharper
              discovery questions and outreach angles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const SESSION_EXAMPLES = [
  {
    name: "Stripe",
    website: "https://stripe.com",
    objective:
      "Prepare for an enterprise sales call — understand their platform, ICP, recent product moves, and strong discovery questions.",
  },
  {
    name: "Vercel",
    website: "https://vercel.com",
    objective:
      "Research Vercel before a partnership discussion — focus on their developer platform, enterprise motion, and competitive positioning.",
  },
  {
    name: "Notion",
    website: "https://notion.so",
    objective:
      "Get a briefing on Notion's product suite, target customers, and expansion signals ahead of a discovery call.",
  },
] as const;

export function ExampleSessionsCard({
  onSelect,
}: {
  onSelect: (example: (typeof SESSION_EXAMPLES)[number]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">Quick start templates</CardTitle>
        <CardDescription>Load a proven example to get started faster.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {SESSION_EXAMPLES.map((example) => (
          <button
            key={example.name}
            type="button"
            onClick={() => onSelect(example)}
            className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50"
          >
            <CompanyLogo name={example.name} website={example.website} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{example.name}</p>
                <Badge variant="outline" className="text-[10px]">
                  Example
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{example.objective}</p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

export function ResearchStatusBadge({ pending }: { pending: boolean }) {
  if (!pending) {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle2 className="size-3 text-green-600" />
        Ready to run
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Loader2 className="size-3 animate-spin" />
      Starting workflow…
    </Badge>
  );
}
