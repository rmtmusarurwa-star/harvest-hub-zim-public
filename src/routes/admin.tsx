import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/admin")({
  component: () => <PagePlaceholder title="Admin" />,
});
