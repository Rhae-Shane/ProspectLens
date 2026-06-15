import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";

import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { prefetchCompanyLogos } from "@/lib/company-logo-cache";

import { OverviewMetrics } from "@/pages/home/_components/overview-metrics";
import { RecentSessionsSection } from "@/pages/home/_components/recent-sessions-section";
import { WorkflowOverviewCard } from "@/pages/home/_components/workflow-overview-card";

export function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sessions", "home"],
    queryFn: () => api.listSessions(1, 50),
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      if (!items?.some((session) => session.status === "running" || session.status === "pending")) {
        return false;
      }
      return 30_000;
    },
  });

  const sessions = data?.items ?? [];
  const totalSessions = data?.total ?? sessions.length;

  useEffect(() => {
    if (sessions.length > 0) {
      prefetchCompanyLogos(sessions.map((session) => session.website));
    }
  }, [sessions]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-medium text-3xl leading-none tracking-tight">Research Hub</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Your sellers run the conversation. ProspectLens researches companies, generates structured meeting briefings,
            and powers follow-up chat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/sessions">View sessions</Link>
          </Button>
          <Button asChild>
            <Link to="/sessions/new">
              <Plus data-icon="inline-start" />
              New research
            </Link>
          </Button>
        </div>
      </div>

      <OverviewMetrics sessions={sessions} total={totalSessions} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
        <RecentSessionsSection sessions={sessions} isLoading={isLoading} />
        <WorkflowOverviewCard />
      </div>

      {!isLoading && sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-background">
            <Sparkles className="size-5 text-primary" />
          </div>
          <h2 className="mt-4 font-medium text-lg">Start your first research session</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground text-sm">
            Enter a company, website, and objective to generate a full meeting briefing powered by LangGraph workflows.
          </p>
          <Button asChild className="mt-5">
            <Link to="/sessions/new">
              <Plus data-icon="inline-start" />
              Create research session
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
