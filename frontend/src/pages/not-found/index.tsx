import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="surface-card max-w-md p-10 text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 font-semibold">ไม่พบหน้าที่คุณต้องการ</p>
        <p className="mt-2 text-sm text-muted-foreground">หน้านี้อาจถูกย้ายหรือไม่มีอยู่ในระบบ</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          กลับหน้าแดชบอร์ด
        </Link>
      </div>
    </div>
  );
}
