"use no memo";

import { format, parseISO } from "date-fns";
import { CalendarDays, Loader2, Plus, Target } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyIdentity } from "@/prospectlens/CompanyLogo";
import { SessionStatusBadge } from "@/prospectlens/SessionStatusBadge";
import type { Session } from "@/types/report";

interface RecentSessionsSectionProps {
  sessions: Session[];
  isLoading?: boolean;
}

export function RecentSessionsSection({ sessions, isLoading }: RecentSessionsSectionProps) {
  const navigate = useNavigate();
  const recentSessions = sessions.slice(0, 5);

  const openSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">Recent Research Sessions</CardTitle>
        <CardDescription>Jump back into your latest company briefings and active workflows.</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/sessions">View all</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/sessions/new">
                <Plus data-icon="inline-start" />
                New Research
              </Link>
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading sessions...
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
            <p className="text-muted-foreground text-sm">No research sessions yet. Start your first company briefing.</p>
            <Button asChild>
              <Link to="/sessions/new">
                <Plus data-icon="inline-start" />
                Create Your First Session
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4 **:data-[slot='table-cell']:py-4">
              <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm">
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((session) => {
                  const createdAt = parseISO(session.created_at);

                  return (
                    <TableRow
                      key={session.id}
                      className="cursor-pointer border-border/50 transition-colors hover:bg-muted/40"
                      onClick={() => openSession(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSession(session.id);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${session.company_name} session`}
                    >
                      <TableCell>
                        <CompanyIdentity name={session.company_name} website={session.website} />
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-md items-start gap-2">
                          <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <p className="truncate text-muted-foreground text-sm" title={session.objective}>
                            {session.objective}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SessionStatusBadge status={session.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <div className="grid gap-0.5">
                            <span className="text-sm">{format(createdAt, "do MMM yyyy")}</span>
                            <span className="text-muted-foreground text-xs">{format(createdAt, "h:mm a")}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
