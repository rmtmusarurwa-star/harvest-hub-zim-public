import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/financial-hub")({
  component: () => <PagePlaceholder title="Financial Hub" />,
});
