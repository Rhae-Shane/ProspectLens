"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCost } from "@/lib/utils";
import { CompanyIdentity } from "@/prospectlens/CompanyLogo";
import { SessionStatusBadge } from "@/prospectlens/SessionStatusBadge";
import type { Session } from "@/types/report";

export const sessionsColumns: ColumnDef<Session>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all sessions on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select ${row.original.company_name}`}
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <CompanyIdentity
        name={row.original.company_name}
        website={row.original.website}
        showWebsite
      />
    ),
    enableHiding: false,
  },
  {
    accessorKey: "objective",
    header: "Objective",
    cell: ({ row }) => (
      <p className="max-w-md truncate text-sm text-muted-foreground" title={row.original.objective}>
        {row.original.objective}
      </p>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <SessionStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = parseISO(row.original.created_at);

      return (
        <div className="grid gap-0.5">
          <span className="text-sm">{format(createdAt, "do MMMM yyyy")}</span>
          <span className="text-muted-foreground text-xs">at {format(createdAt, "h:mm a")}</span>
        </div>
      );
    },
  },
  {
    id: "usage",
    header: "Usage",
    cell: ({ row }) =>
      row.original.total_tokens > 0 ? (
        <div className="grid gap-0.5 tabular-nums">
          <span className="text-sm">{row.original.total_tokens.toLocaleString()} tokens</span>
          <span className="text-muted-foreground text-xs">{formatCost(row.original.total_cost_usd)}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">View</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-muted-foreground hover:bg-transparent focus-visible:bg-transparent"
        >
          <Link to={`/sessions/${row.original.id}`} aria-label={`View ${row.original.company_name} session`}>
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  },
];
