import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// ไม่ต้องมี functionMiddleware แนบ auth token แบบ Supabase อีกแล้ว
// เพราะ apiFetch() ใน src/lib/api-client.ts แนบ Authorization header ให้ทุก request ที่ยิงไป Go backend โดยตรง
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
