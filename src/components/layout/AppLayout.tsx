import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FieldMapBackground } from "@/components/brand/FieldMapBackground";
import { AskHarvestAi } from "@/components/brand/AskHarvestAi";
import { useDecorativeMotionGuard } from "@/hooks/use-decorative-motion";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useDecorativeMotionGuard();

  return (
    <div className="h-screen overflow-hidden ambient-glow mesh-bg">
      <FieldMapBackground />
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="lg:pl-72 h-full flex flex-col overflow-hidden">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-10 pt-4 lg:px-6 lg:pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
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
