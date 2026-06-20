import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FieldMapBackground } from "@/components/brand/FieldMapBackground";
import { AskHarvestAi } from "@/components/brand/AskHarvestAi";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen ambient-glow">
      <FieldMapBackground />
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="lg:pl-72">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="px-3 pb-10 pt-4 lg:px-6 lg:pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AskHarvestAi />
    </div>
  );
}
