"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TtsPlayer } from "@/components/practice/tts-player";

export function DictationInput({
  sentence,
  onSubmit,
}: {
  sentence: string;
  onSubmit: (answer: string) => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <TtsPlayer text={sentence} onEnded={() => setHasPlayed(true)} label="Nghe câu" />

      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!hasPlayed || submitted}
        placeholder={
          hasPlayed
            ? "Gõ lại chính xác câu bạn vừa nghe..."
            : "Nghe câu trước khi gõ lại"
        }
        className="min-h-[100px] resize-y"
      />

      {!submitted && (
        <Button
          className="w-fit bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          disabled={!hasPlayed || answer.trim().length === 0}
          onClick={() => {
            setSubmitted(true);
            onSubmit(answer);
          }}
        >
          Nộp bài
        </Button>
      )}
    </div>
  );
}
