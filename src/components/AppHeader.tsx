import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

/** Brand logo drawn as a mask so it takes the current text color in both themes. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="grepp logo"
      className={`block aspect-[189/54] bg-foreground [forced-color-adjust:none] ${className}`}
      style={{
        maskImage: "url(/grepp.svg)",
        WebkitMaskImage: "url(/grepp.svg)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}

/** Top bar with the logo on the left, optional actions and the theme toggle on the right. */
export function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-5 pt-6">
      <Logo className="w-24 sm:w-28" />
      <div className="flex items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Centered single-card layout used by the sign-in and account pages. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
      <AppHeader />
      {children}
    </div>
  );
}
