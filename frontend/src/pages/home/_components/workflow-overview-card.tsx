import { ArrowRight, ClipboardList, Plus, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const WORKFLOW_STEPS = [
  "Define your research objective",
  "AI gathers and analyzes company data",
  "Quality check validates the briefing",
  "Review your structured meeting report",
] as const;

export function WorkflowOverviewCard() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="leading-none">Your research copilot</CardTitle>
          <CardDescription>
            ProspectLens handles company research, briefing generation, and follow-up chat so your team can focus on
            the conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full justify-start">
              <Link to="/sessions/new">
                <Plus data-icon="inline-start" />
                Start new research
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/sessions">
                <ClipboardList data-icon="inline-start" />
                Browse all sessions
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="leading-none">How it works</CardTitle>
          <CardDescription>Each session runs through a multi-step LangGraph workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground text-xs font-medium">
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-start gap-3">
            <Search className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Built for sales prep</p>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                Generate discovery questions, outreach angles, and company context before every meeting.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-sm">Tip</p>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                Specific objectives produce sharper briefings. Mention the meeting type and what you need to learn.
              </p>
            </div>
          </div>
          <Button asChild variant="link" className="h-auto px-0">
            <Link to="/sessions/new">
              Create a session
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
