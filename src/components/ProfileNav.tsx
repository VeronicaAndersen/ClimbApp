import { useState } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import {
  CalendarDays,
  Zap,
  User,
  Users,
  Trophy,
  Dices,
  Settings,
  MoreHorizontal,
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
interface ViewMenuItem extends MenuItemBase {
  value: NavigationView;
  to?: undefined;
}

/** Links to another route. */
interface LinkMenuItem extends MenuItemBase {
  value: string;
  to: string;
}

type MenuItem = ViewMenuItem | LinkMenuItem;

const isLinkItem = (item: MenuItem): item is LinkMenuItem => item.to !== undefined;

const MENU_ITEMS: readonly MenuItem[] = [
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

/** Follows a route link if the item has one, otherwise switches view. */
const navigateTo = (item: MenuItem, onNavigate: ProfileNavProps["onNavigate"]) =>
  isLinkItem(item) ? onNavigate(null, item.to) : onNavigate(item.value);

const ADMIN_ITEMS = MENU_ITEMS.filter((item) => item.requiresAdmin);
const CLIMBER_ITEMS = MENU_ITEMS.filter((item) => !item.requiresAdmin);

export interface ProfileNavProps {
  activeView: NavigationView;
  isAdmin: boolean;
  /**
   * Switches view or follows a link. Returns false when the user cancelled
   * (for example to keep unsaved changes), so the overflow menu stays open.
   */
  onNavigate: (view: NavigationView | null, to?: string) => boolean;
}

/** Desktop menubar; render it inside the page card. */
export function ProfileMenubar({ activeView, isAdmin, onNavigate }: ProfileNavProps) {
  const getMenuItemClass = (itemValue: string) =>
    `px-4 py-2 rounded-full font-medium cursor-pointer select-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
      activeView === itemValue
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;

  return (
    <Menubar.Root className="mb-6 hidden md:flex justify-center gap-1 self-center rounded-full border border-border bg-card/90 p-1 shadow-soft text-sm">
      {MENU_ITEMS.filter((item) => !item.requiresAdmin || isAdmin).map((item) => (
        <Menubar.Menu key={item.value} value={item.value}>
          <Menubar.Trigger
            onClick={() => navigateTo(item, onNavigate)}
            className={getMenuItemClass(item.value)}
          >
            {item.label}
          </Menubar.Trigger>
        </Menubar.Menu>
      ))}
    </Menubar.Root>
  );
}

/** Mobile bottom navigation with the admin overflow ("Mer") panel. */
export function ProfileBottomNav({ activeView, isAdmin, onNavigate }: ProfileNavProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const navigate = (item: MenuItem) => {
    const navigated = navigateTo(item, onNavigate);
    if (navigated) setMoreMenuOpen(false);
  };

  const adminViewActive = ADMIN_ITEMS.some((i) => !i.to && activeView === i.value);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border md:hidden">
      {/* Admin overflow panel */}
      {isAdmin && moreMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
          <div className="absolute bottom-16 right-0 z-50 bg-card border border-border rounded-tl-xl shadow-lg py-2 min-w-40">
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = !item.to && activeView === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => navigate(item)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-foreground bg-muted/50"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.mobileLabel}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex justify-around items-stretch h-16">
        {CLIMBER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.value;
          return (
            <button
              key={item.value}
              onClick={() => navigate(item)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.mobileLabel}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full bg-primary transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors ${
              moreMenuOpen || adminViewActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>Mer</span>
            <span
              className={`w-1.5 h-1.5 rounded-full bg-primary transition-opacity ${
                adminViewActive ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        )}
      </div>
    </nav>
  );
}
