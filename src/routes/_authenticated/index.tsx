import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/_authenticated/")({
  component: () => (
    <PagePlaceholder
      title="Dashboard"
      description="Your command center for harvests, listings, orders and operations across Zimbabwe."
    />
  ),
});
