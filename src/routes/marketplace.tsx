import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/marketplace")({
  component: () => <PagePlaceholder title="Marketplace" />,
});
