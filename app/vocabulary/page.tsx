import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { VocabularyList } from "@/components/vocabulary/vocabulary-list";
import { getSavedWords } from "@/lib/vocabulary-queries";

export default async function VocabularyPage() {
  const session = await auth();
  const words = await getSavedWords(session!.user.id);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6 sm:px-10">
        <h1 className="text-2xl font-semibold">Sổ từ vựng</h1>
        <p className="text-[15px] text-muted-foreground">
          Các từ bạn đã chạm để tra nghĩa và lưu lại trong lúc luyện tập.
        </p>
        <VocabularyList
          items={words.map((w) => ({
            id: w.id,
            word: w.word,
            phonetic: w.phonetic,
            meaningVi: w.meaningVi,
            createdAt: w.createdAt.toISOString(),
          }))}
        />
      </div>
    </AppShell>
  );
}
