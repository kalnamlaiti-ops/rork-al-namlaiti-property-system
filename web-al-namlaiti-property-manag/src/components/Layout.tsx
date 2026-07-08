import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { LiveIndicator } from "./LiveIndicator";
import { ShareButton } from "./ShareButton";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-muted/20 md:pl-64">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-foreground hover:bg-muted md:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <LiveIndicator />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/70 text-foreground shadow-sm transition hover:scale-105 hover:bg-muted"
            aria-label="Toggle color theme"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </button>
          <ShareButton />
        </div>
      </header>
      <main className="min-h-screen p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
