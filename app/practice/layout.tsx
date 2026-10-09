import { requireClassStudent } from "@/lib/require-class-student";

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  await requireClassStudent();
  return children;
}
