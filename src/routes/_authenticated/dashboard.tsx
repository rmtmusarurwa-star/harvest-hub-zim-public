import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { MarketTicker } from "@/components/dashboard/MarketTicker";
import { StatCards } from "@/components/dashboard/StatCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DemandAlerts } from "@/components/dashboard/DemandAlerts";
import { FeaturedOpportunities } from "@/components/dashboard/FeaturedOpportunities";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { AIInsight } from "@/components/dashboard/AIInsight";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { CommandBar } from "@/components/agent/CommandBar";
import { AgentControlCenter } from "@/components/agent/AgentControlCenter";
import { LiveActivityFeed } from "@/components/agent/LiveActivityFeed";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary/80">
              Dashboard{profile?.location ? ` · ${profile.location}` : ""}
            </span>
          </div>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">
            Mhoro, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's moving across Zimbabwe's farms and markets today.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
          <Link to="/receipts">
            <Receipt className="h-4 w-4" /> View All Receipts
          </Link>
        </Button>
      </motion.div>

      <CommandBar />
      <MarketTicker />
      <StatCards />
      <QuickActions />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px] lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <VolumeChart />
          <ActivityFeed />
        </div>
        <div className="space-y-6">
          <AgentControlCenter />
          <LiveActivityFeed />
          <WeatherWidget />
          <AIInsight />
          <DemandAlerts />
        </div>
      </div>

      <FeaturedOpportunities />
    </section>
  );
}
