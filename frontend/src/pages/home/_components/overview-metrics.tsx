import { AlertCircle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/types/report";

interface OverviewMetricsProps {
  sessions: Session[];
  total: number;
}

export function OverviewMetrics({ sessions, total }: OverviewMetricsProps) {
  const completed = sessions.filter((session) => session.status === "completed").length;
  const inProgress = sessions.filter(
    (session) => session.status === "running" || session.status === "pending",
  ).length;
  const failed = sessions.filter((session) => session.status === "failed").length;

  const metrics = [
    {
      label: "Total Sessions",
      value: total.toLocaleString(),
      hint: "Research runs across your workspace",
      icon: ClipboardList,
      badge: null,
    },
    {
      label: "Completed",
      value: completed.toLocaleString(),
      hint: "Briefings ready to review",
      icon: CheckCircle2,
      badge: completed > 0 ? "success" : null,
    },
    {
      label: "In Progress",
      value: inProgress.toLocaleString(),
      hint: "Workflows currently running",
      icon: Loader2,
      badge: inProgress > 0 ? "active" : null,
    },
    {
      label: "Failed",
      value: failed.toLocaleString(),
      hint: "Sessions that need a retry",
      icon: AlertCircle,
      badge: failed > 0 ? "warning" : null,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <metric.icon className={`size-4 ${metric.label === "In Progress" && inProgress > 0 ? "animate-spin" : ""}`} />
              </div>
            </CardTitle>
            <CardDescription>{metric.label}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{metric.value}</div>
              {metric.badge === "active" ? (
                <Badge>Active</Badge>
              ) : metric.badge === "warning" ? (
                <Badge variant="destructive">Needs attention</Badge>
              ) : metric.badge === "success" ? (
                <Badge>Ready</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">{metric.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
