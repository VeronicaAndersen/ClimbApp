import {
  CalendarDays,
  Zap,
  User,
  Users,
  Trophy,
  Dices,
  Settings,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavigationView =
  | "competition"
  | "active_competition"
  | "profile"
  | "users"
  | "admin"
  | "leaderboard"
  | "statistics";

interface MenuItemBase {
  label: string;
  mobileLabel: string;
  requiresAdmin: boolean;
  icon: LucideIcon;
}

/** Switches the view shown on the Profile page. */
export interface ViewMenuItem extends MenuItemBase {
  value: NavigationView;
  to?: undefined;
}

/** Links to another route. */
interface LinkMenuItem extends MenuItemBase {
  value: string;
  to: string;
}

export type MenuItem = ViewMenuItem | LinkMenuItem;

export const isLinkItem = (item: MenuItem): item is LinkMenuItem => item.to !== undefined;

export const MENU_ITEMS: readonly MenuItem[] = [
  {
    value: "competition",
    label: "Anmälan",
    mobileLabel: "Anmälan",
    requiresAdmin: false,
    icon: CalendarDays,
  },
  {
    value: "active_competition",
    label: "Mina poäng",
    mobileLabel: "Poäng",
    requiresAdmin: false,
    icon: Zap,
  },
  {
    value: "profile",
    label: "Profil",
    mobileLabel: "Profil",
    requiresAdmin: false,
    icon: User,
  },
  {
    value: "users",
    label: "Klättrare",
    mobileLabel: "Klättrare",
    requiresAdmin: true,
    icon: Users,
  },
  {
    value: "leaderboard",
    label: "Resultatlista",
    mobileLabel: "Resultat",
    requiresAdmin: true,
    icon: Trophy,
  },
  {
    value: "statistics",
    label: "Statistik",
    mobileLabel: "Statistik",
    requiresAdmin: true,
    icon: BarChart3,
  },
  {
    value: "tombola",
    label: "Tombola",
    mobileLabel: "Tombola",
    requiresAdmin: true,
    icon: Dices,
    to: "/tombola",
  },
  {
    value: "admin",
    label: "Admin",
    mobileLabel: "Admin",
    requiresAdmin: true,
    icon: Settings,
  },
];

export const ADMIN_ITEMS = MENU_ITEMS.filter((item) => item.requiresAdmin);

/** Profile views only admins may see, derived from the menu so they cannot drift. */
export const ADMIN_VIEWS: readonly NavigationView[] = ADMIN_ITEMS.filter(
  (item): item is ViewMenuItem => !isLinkItem(item)
).map((item) => item.value);
export const CLIMBER_ITEMS = MENU_ITEMS.filter((item) => !item.requiresAdmin);
