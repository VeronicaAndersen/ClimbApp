import type { ReactNode } from "react";
import { Theme } from "@radix-ui/themes";

/**
 * Keeps not-yet-themed views (admin, Tombola) in light colors when the app is
 * in dark mode. They still use hardcoded white/grey classes, which would
 * otherwise get light inherited text on white panels.
 */
export function LightScope({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Theme
      appearance="light"
      accentColor="gray"
      grayColor="olive"
      radius="large"
      hasBackground={false}
      className={`light-scope ${className ?? ""}`}
    >
      {children}
    </Theme>
  );
}
