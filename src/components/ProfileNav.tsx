import { useEffect, useState } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import { MoreHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
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

  // The sheet is mobile-only: close it if the viewport grows to desktop
  // (tablet rotation), or its scrim and scroll lock would stay with no sheet.
  useEffect(() => {
    if (!moreMenuOpen || !window.matchMedia) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const close = () => {
      if (desktop.matches) setMoreMenuOpen(false);
    };
    close();
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, [moreMenuOpen]);

  const navigate = (item: MenuItem) => {
    const navigated = navigateTo(item, onNavigate);
    if (navigated) setMoreMenuOpen(false);
  };

  const adminViewActive = ADMIN_ITEMS.some((i) => !i.to && activeView === i.value);

  return (
    <>
      {/* Admin overflow as a bottom sheet: drag or flick down to dismiss, Escape to close. */}
      {isAdmin && (
        <Drawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <DrawerContent className="md:hidden">
            <DrawerTitle className="sr-only">Mer</DrawerTitle>
            <DrawerDescription className="sr-only">Administrativa vyer</DrawerDescription>
            <div className="px-2 pt-2 pb-3">
              {ADMIN_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = !item.to && activeView === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => navigate(item)}
                    aria-current={isActive ? "page" : undefined}
                    className={`pressable flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/70 ${
                      isActive
                        ? "bg-muted/60 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                    {item.mobileLabel}
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
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
              aria-haspopup="dialog"
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
