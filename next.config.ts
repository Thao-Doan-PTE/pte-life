import type { NextConfig } from "next";

// Header bảo mật áp cho mọi trang:
// - frame-ancestors / X-Frame-Options: không cho trang khác nhúng PTE-Life vào
//   iframe (chống clickjacking — lừa bấm nút trong trang bị nhúng ẩn).
// - nosniff: trình duyệt không tự đoán kiểu file (chống chạy file upload như HTML).
// - Permissions-Policy: chỉ chính trang PTE-Life được xin micro (Speaking),
//   tắt hẳn camera/vị trí.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Mặc định 1MB không đủ cho ảnh đại diện (tối đa 3MB). Vercel giới hạn
      // body request ở 4.5MB nên đặt 4mb.
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
