import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Building2, Globe, Loader2, Search, Sparkles } from "lucide-react";

import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { prefetchCompanyLogo, prefetchCompanyLogos } from "@/lib/company-logo-cache";

import {
  ExampleSessionsCard,
  ResearchStatusBadge,
  SESSION_EXAMPLES,
  SessionPreviewPanel,
} from "@/pages/sessions/_components/session-preview-panel";

export function NewSessionPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [objective, setObjective] = useState("");

  const createMutation = useMutation({
    mutationFn: api.createSession,
    onSuccess: async (session) => {
      await api.runWorkflow(session.id);
      navigate(`/sessions/${session.id}`, { state: { expectRunning: true } });
    },
  });

  useEffect(() => {
    prefetchCompanyLogos(SESSION_EXAMPLES.map((example) => example.website));
  }, []);

  useEffect(() => {
    if (website.trim()) prefetchCompanyLogo(website);
  }, [website]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ company_name: companyName, website, objective });
  };

  const applyExample = (example: (typeof SESSION_EXAMPLES)[number]) => {
    setCompanyName(example.name);
    setWebsite(example.website);
    setObjective(example.objective);
    prefetchCompanyLogo(example.website);
  };

  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-medium text-3xl leading-none tracking-tight">New Research Session</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Tell ProspectLens who you are meeting and what you need to learn. We will research the company and
            generate a structured briefing in minutes.
          </p>
        </div>
        <ResearchStatusBadge pending={createMutation.isPending} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="leading-none">Company details</CardTitle>
              <CardDescription>
                We use the website to pull branding and enrich research with live company context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FieldSet>
                  <FieldLegend variant="label">Session setup</FieldLegend>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="company-name">Company name</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Building2 />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="company-name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Stripe"
                          required
                        />
                      </InputGroup>
                      <FieldDescription>The account or prospect you are researching.</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="website">Website</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Globe />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="website"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://stripe.com"
                          type="url"
                          required
                        />
                      </InputGroup>
                      <FieldDescription>Used for logo detection and domain-based research.</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="objective">Research objective</FieldLabel>
                      <InputGroup className="h-auto min-h-28 items-start">
                        <InputGroupAddon align="block-start" className="pt-2.5">
                          <Search />
                        </InputGroupAddon>
                        <Textarea
                          id="objective"
                          data-slot="input-group-control"
                          value={objective}
                          onChange={(e) => setObjective(e.target.value)}
                          placeholder="e.g. Prepare for an enterprise sales meeting to discuss payment infrastructure integration, competitive landscape, and discovery questions."
                          required
                          minLength={10}
                          className="min-h-24 flex-1 resize-none rounded-none border-0 bg-transparent py-2.5 shadow-none ring-0 focus-visible:ring-0"
                        />
                      </InputGroup>
                      <FieldDescription>
                        Be specific about the meeting goal, your role, and what you want in the briefing.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <Separator />

                {createMutation.isError ? (
                  <p className="text-destructive text-sm">{(createMutation.error as Error).message}</p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-xs">
                    Research typically completes in a few minutes depending on company complexity.
                  </p>
                  <Button type="submit" disabled={createMutation.isPending} className="sm:min-w-48">
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin" data-icon="inline-start" />
                        Creating session…
                      </>
                    ) : (
                      <>
                        <Sparkles data-icon="inline-start" />
                        Create &amp; Run Research
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ExampleSessionsCard onSelect={applyExample} />
        </div>

        <SessionPreviewPanel companyName={companyName} website={website} objective={objective} />
      </div>
    </div>
  );
}
