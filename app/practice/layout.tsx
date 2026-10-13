import { requireClassStudent } from "@/lib/require-class-student";

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  // Cho cả người dùng thử Tủ qua layout — từng trang tự kiểm tra chặt phần Tủ.
  await requireClassStudent({ allowTuTrial: true });
  return children;
}
