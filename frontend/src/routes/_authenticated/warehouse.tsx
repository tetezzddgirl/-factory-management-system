import { createFileRoute } from "@tanstack/react-router";
import { WarehousePage } from "@/pages/warehouse";

export const Route = createFileRoute("/_authenticated/warehouse")({
  component: WarehousePage,
});
