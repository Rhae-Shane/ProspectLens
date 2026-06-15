import { useMemo, useState } from "react";
import { eachDayOfInterval, format, parseISO, startOfDay, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { Area, CartesianGrid, ComposedChart, Line, XAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Session } from "@/types/report";

const chartConfig = {
  total: {
    label: "Total",
    color: "#ffffff",
  },
  completed: {
    label: "Completed",
    color: "#22c55e",
  },
  failed: {
    label: "Failed",
    color: "#ef4444",
  },
} satisfies ChartConfig;

type Period = "week" | "month" | "quarter";
type StatusFilter = "all" | "completed" | "running" | "failed";

const periodDays: Record<Period, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

function buildChartData(sessions: Session[], days: number, statusFilter: StatusFilter) {
  const end = startOfDay(new Date());
  const start = subDays(end, days - 1);
  const interval = eachDayOfInterval({ start, end });

  const filteredSessions =
    statusFilter === "all"
      ? sessions
      : statusFilter === "running"
        ? sessions.filter((session) => session.status === "running" || session.status === "pending")
        : sessions.filter((session) => session.status === statusFilter);

  return interval.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const daySessions = filteredSessions.filter(
      (session) => format(parseISO(session.created_at), "yyyy-MM-dd") === dayKey,
    );

    return {
      date: dayKey,
      total: daySessions.length,
      completed: daySessions.filter((session) => session.status === "completed").length,
      failed: daySessions.filter((session) => session.status === "failed").length,
    };
  });
}

interface SessionsPerformanceOverviewProps {
  sessions: Session[];
}

export function SessionsPerformanceOverview({ sessions }: SessionsPerformanceOverviewProps) {
  const [period, setPeriod] = useState<Period>("quarter");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const chartData = useMemo(
    () => buildChartData(sessions, periodDays[period], statusFilter),
    [sessions, period, statusFilter],
  );

  const periodLabel =
    period === "week" ? "Last 7 days" : period === "month" ? "Last 30 days" : "Last 3 months";

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Research Activity</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">Session activity for the {periodLabel.toLowerCase()}</span>
          <span className="@[540px]/card:hidden">{periodLabel}</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue placeholder="3 months" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Period</SelectLabel>
                <SelectItem value="week">7 days</SelectItem>
                <SelectItem value="month">30 days</SelectItem>
                <SelectItem value="quarter">3 months</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="All sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All sessions</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="running">In progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button asChild variant="outline" size="sm">
            <Link to="/sessions">View sessions</Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={chartData} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillTotalSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={48}
              tickFormatter={(value) =>
                parseISO(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-50"
                  indicator="line"
                  labelFormatter={(value) => format(parseISO(value), "d MMMM yyyy")}
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />

            <Area
              dataKey="total"
              type="natural"
              fill="url(#fillTotalSessions)"
              stroke="var(--color-total)"
              strokeWidth={1.25}
              dot={false}
              fillOpacity={1}
            />
            <Line
              dataKey="completed"
              type="natural"
              stroke="var(--color-completed)"
              strokeWidth={1.4}
              dot={false}
            />
            <Line
              dataKey="failed"
              type="natural"
              stroke="var(--color-failed)"
              strokeWidth={1.2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
