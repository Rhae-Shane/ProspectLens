import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";

import { SidebarProvider } from "@/components/ui/sidebar";

import { MailSidebar } from "./_components/mail-sidebar";

export default function MailLayout() {
  return (
    <div className="relative h-full">
      <SidebarProvider className="h-full min-h-0">
        <MailSidebar />
        <div className="size-full">
          <Outlet />
        </div>
      </SidebarProvider>
    </div>
  );
}
