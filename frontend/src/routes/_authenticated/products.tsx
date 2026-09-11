import { createFileRoute } from "@tanstack/react-router";
import { ProductsBomPage } from "@/pages/products-bom";
import { StoreProvider } from "@/services/store";

export const Route = createFileRoute("/_authenticated/products")({
  component: () => (
    <StoreProvider>
      <ProductsBomPage />
    </StoreProvider>
  ),
});