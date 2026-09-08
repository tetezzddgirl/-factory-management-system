import { createFileRoute } from "@tanstack/react-router";
import { ProductsBomPage } from "@/pages/products-bom";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsBomPage,
});
