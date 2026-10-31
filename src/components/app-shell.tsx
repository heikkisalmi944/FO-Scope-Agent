import { Outlet, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster } from "@/components/ui/sonner";

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#tyoalue"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Siirry työalueelle
      </a>
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-6">
          <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
            <rect x="2" y="16" width="13" height="13" rx="2.5" className="fill-primary" />
            <rect x="17" y="16" width="13" height="13" rx="2.5" className="fill-primary opacity-60" />
            <rect x="9.5" y="3" width="13" height="11" rx="2.5" className="fill-primary opacity-35" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">F&amp;O Scope Agent <span className="ml-1 rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">V8</span></span>
            <span className="text-xs text-muted-foreground">Fellowmind · Dynamics 365 Finance &amp; Operations</span>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex-1"
        >
          <Outlet />
        </motion.div>
      </main>
      <Toaster />
    </div>
  );
}

export default AppShell;
