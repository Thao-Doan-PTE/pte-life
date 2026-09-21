"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteAction } from "@/lib/actions/favorites";

export function FavoriteStarButton({
  questionId,
  initialFavorited,
}: {
  questionId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      try {
        const result = await toggleFavoriteAction(questionId);
        setFavorited(result);
      } catch {
        setFavorited(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? "Bỏ ưa thích" : "Đánh dấu ưa thích"}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border disabled:opacity-60"
      style={{
        borderColor: favorited ? "#f59e0b" : "var(--wfd-border)",
        color: "#f59e0b",
        background: favorited ? "#FFF7ED" : "transparent",
      }}
    >
      <Star className="size-4" fill={favorited ? "#f59e0b" : "none"} />
    </button>
  );
}
