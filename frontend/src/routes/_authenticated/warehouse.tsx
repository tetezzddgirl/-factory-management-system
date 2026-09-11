import { createFileRoute } from "@tanstack/react-router";
import { WarehousePage } from "@/pages/warehouse";
import { StoreProvider } from "@/services/store";

export const Route = createFileRoute("/_authenticated/warehouse")({
  component: () => (
    <StoreProvider>
      <WarehousePage />
    </StoreProvider>
  ),
});