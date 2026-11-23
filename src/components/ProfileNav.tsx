import { useState } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import { MoreHorizontal } from "lucide-react";
import {
  ADMIN_ITEMS,
  CLIMBER_ITEMS,
  MENU_ITEMS,
  isLinkItem,
  type MenuItem,
  type NavigationView,
} from "@/constants/profileMenu";

export type { NavigationView } from "@/constants/profileMenu";

/** Follows a route link if the item has one, otherwise switches view. */
const navigateTo = (item: MenuItem, onNavigate: ProfileNavProps["onNavigate"]) =>
  isLinkItem(item) ? onNavigate(null, item.to) : onNavigate(item.value);

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
    `pressable px-4 py-2 rounded-full font-medium cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      activeView === itemValue
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;

  return (
    <Menubar.Root className="material mb-6 hidden md:flex justify-center gap-1 self-center rounded-full border border-border/60 p-1 text-sm">
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
    <>
      {/* Admin overflow panel, outside <nav>: its backdrop-filter would trap position:fixed children. */}
      {isAdmin && moreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 md:hidden animate-in fade-in duration-200 dark:bg-black/30"
            onClick={() => setMoreMenuOpen(false)}
          />
          {/* Grows out of the "Mer" button it belongs to. */}
          <div className="material fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-2 z-[60] md:hidden min-w-44 origin-bottom-right rounded-2xl border border-border/60 py-1.5 shadow-material animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-200 ease-apple">
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = !item.to && activeView === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => navigate(item)}
                  className={`pressable flex items-center gap-3 w-full px-4 py-3 text-sm font-medium active:bg-muted/70 ${
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
      <nav className="material fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex justify-around items-stretch h-16">
          {CLIMBER_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.value;
            return (
              <button
                key={item.value}
                onClick={() => navigate(item)}
                className={`pressable flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium tracking-[0.01em] ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.mobileLabel}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-primary transition-[opacity,transform] duration-300 ease-apple ${
                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
                  }`}
                />
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              className={`pressable flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium tracking-[0.01em] ${
                moreMenuOpen || adminViewActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span>Mer</span>
              <span
                className={`w-1.5 h-1.5 rounded-full bg-primary transition-[opacity,transform] duration-300 ease-apple ${
                  adminViewActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
                }`}
              />
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
