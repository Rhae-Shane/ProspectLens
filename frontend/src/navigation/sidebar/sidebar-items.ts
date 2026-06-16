import {
  FileText,
  Home,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: typeof Home;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: typeof Home;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 0,
    label: "ProspectLens",
    items: [
      {
        title: "Research Hub",
        url: "/home",
        icon: Home,
      },
      {
        title: "New Research",
        url: "/sessions/new",
        icon: PlusCircle,
      },
      {
        title: "Research Sessions",
        url: "/sessions",
        icon: LayoutDashboard,
      },
      {
        title: "Research Reports",
        url: "/reports",
        icon: FileText,
      },
      {
        title: "Follow-up Chat",
        url: "/follow-up-chat",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: 1,
    label: "Integrations",
    items: [
      {
        title: "API Usage",
        url: "/api-usage",
        icon: KeyRound,
      },
    ],
  },
];
