import { auth } from "@/auth";
import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register"];
// Trang chủ LMS mới (Header/Rail/Stage) — phục vụ cả khách chưa đăng nhập,
// nên không bắt buộc auth ở đây; việc phân nhánh nội dung khách/học viên xử
// lý ngay trong từng page (xem app/page.tsx, app/test-dau-vao,  app/de-tu).
const PUBLIC_PAGES = ["/", "/test-dau-vao", "/de-tu"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (isPublicPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|favicon.ico).*)"],
};
