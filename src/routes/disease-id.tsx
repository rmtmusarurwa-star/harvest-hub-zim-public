import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const Route = createFileRoute("/disease-id")({
  component: () => <PagePlaceholder title="Disease ID" />,
});
