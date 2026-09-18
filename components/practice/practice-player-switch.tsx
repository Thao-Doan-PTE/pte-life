import { ReadAloudPlayer } from "@/components/practice/players/read-aloud-player";
import { WriteEssayPlayer } from "@/components/practice/players/write-essay-player";
import { ReadingMcqPlayer } from "@/components/practice/players/reading-mcq-player";
import { ReadingMcqMultiPlayer } from "@/components/practice/players/reading-mcq-multi-player";
import { DictationPlayer } from "@/components/practice/players/dictation-player";
import { SpeakingAudioTaskPlayer } from "@/components/practice/players/speaking-audio-task-player";
import { SpeakingImageTaskPlayer } from "@/components/practice/players/speaking-image-task-player";
import { SpeakingTextTaskPlayer } from "@/components/practice/players/speaking-text-task-player";
import { ListeningWritingPlayer } from "@/components/practice/players/listening-writing-player";
import { ListeningChoicePlayer } from "@/components/practice/players/listening-choice-player";
import { DropdownBlanksPlayer } from "@/components/practice/players/dropdown-blanks-player";
import { DragDropBlanksPlayer } from "@/components/practice/players/drag-drop-blanks-player";
import { ReorderParagraphsPlayer } from "@/components/practice/players/reorder-paragraphs-player";
import { TextBlanksPlayer } from "@/components/practice/players/text-blanks-player";
import { HighlightWordsPlayer } from "@/components/practice/players/highlight-words-player";
import type { PracticeInstructions } from "@/lib/practice-config";
import type { BlankSegment } from "@/components/practice/dropdown-blanks";
import type { ParagraphItem } from "@/components/practice/reorder-paragraphs";
import { stripBlankAnswers } from "@/lib/practice-content-utils";

export function renderPracticePlayer(
  typeId: string,
  questionId: string,
  content: Record<string, unknown>,
  instructions: PracticeInstructions
) {
  switch (typeId) {
    // Speaking
    case "read-aloud":
      if (typeof content.passage === "string")
        return (
          <ReadAloudPlayer
            questionId={questionId}
            passage={content.passage}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
          />
        );
      break;
    case "repeat-sentence":
      if (typeof content.audioUrl === "string" || typeof content.referenceText === "string")
        return (
          <SpeakingAudioTaskPlayer
            questionId={questionId}
            audioUrl={typeof content.audioUrl === "string" ? content.audioUrl : undefined}
            ttsText={typeof content.referenceText === "string" ? content.referenceText : undefined}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
          />
        );
      break;
    case "retell-lecture":
    case "answer-short-question":
    case "summarize-group-discussion":
      if (typeof content.audioUrl === "string")
        return (
          <SpeakingAudioTaskPlayer
            questionId={questionId}
            audioUrl={content.audioUrl}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
          />
        );
      break;
    case "describe-image":
      if (typeof content.imageUrl === "string")
        return (
          <SpeakingImageTaskPlayer
            questionId={questionId}
            imageUrl={content.imageUrl}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
          />
        );
      break;
    case "respond-to-situation":
      if (typeof content.situationText === "string")
        return (
          <SpeakingTextTaskPlayer
            questionId={questionId}
            situationText={content.situationText}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
          />
        );
      break;

    // Writing
    case "write-essay":
      if (typeof content.prompt === "string")
        return (
          <WriteEssayPlayer
            questionId={questionId}
            prompt={content.prompt}
            minWords={instructions.minWords!}
            maxWords={instructions.maxWords!}
            timeLimitSeconds={instructions.timeLimitSeconds!}
          />
        );
      break;
    case "summarize-written-text":
      if (typeof content.passage === "string")
        return (
          <WriteEssayPlayer
            questionId={questionId}
            prompt={content.passage}
            minWords={instructions.minWords!}
            maxWords={instructions.maxWords!}
            timeLimitSeconds={instructions.timeLimitSeconds!}
          />
        );
      break;

    // Reading
    case "reading-mcq-single":
      if (
        typeof content.passage === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ReadingMcqPlayer
            questionId={questionId}
            passage={content.passage}
            question={content.question}
            options={content.options as string[]}
          />
        );
      break;
    case "reading-mcq-multiple":
      if (
        typeof content.passage === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ReadingMcqMultiPlayer
            questionId={questionId}
            passage={content.passage}
            question={content.question}
            options={content.options as string[]}
            maxSelectable={(content.maxSelectable as number) ?? 2}
          />
        );
      break;
    case "reorder-paragraphs":
      if (Array.isArray(content.paragraphs))
        return (
          <ReorderParagraphsPlayer
            questionId={questionId}
            paragraphs={content.paragraphs as ParagraphItem[]}
          />
        );
      break;
    case "reading-fill-blanks-dropdown":
      if (Array.isArray(content.segments))
        return (
          <DropdownBlanksPlayer
            questionId={questionId}
            segments={stripBlankAnswers(content.segments as BlankSegment[])}
          />
        );
      break;
    case "reading-fill-blanks-drag-drop":
      if (Array.isArray(content.segments) && Array.isArray(content.wordBank))
        return (
          <DragDropBlanksPlayer
            questionId={questionId}
            segments={stripBlankAnswers(content.segments as BlankSegment[])}
            wordBank={content.wordBank as string[]}
          />
        );
      break;

    // Listening
    case "summarize-spoken-text":
      if (typeof content.audioUrl === "string")
        return (
          <ListeningWritingPlayer
            questionId={questionId}
            audioUrl={content.audioUrl}
            minWords={instructions.minWords!}
            maxWords={instructions.maxWords!}
            timeLimitSeconds={instructions.timeLimitSeconds!}
          />
        );
      break;
    case "listening-mcq-single":
    case "select-missing-word":
    case "highlight-correct-summary":
      if (
        typeof content.audioUrl === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ListeningChoicePlayer
            questionId={questionId}
            audioUrl={content.audioUrl}
            question={content.question}
            options={content.options as string[]}
            maxSelectable={1}
          />
        );
      break;
    case "listening-mcq-multiple":
      if (
        typeof content.audioUrl === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ListeningChoicePlayer
            questionId={questionId}
            audioUrl={content.audioUrl}
            question={content.question}
            options={content.options as string[]}
            maxSelectable={(content.maxSelectable as number) ?? 2}
          />
        );
      break;
    case "listening-fill-blanks":
      if (typeof content.audioUrl === "string" && Array.isArray(content.segments))
        return (
          <TextBlanksPlayer
            questionId={questionId}
            audioUrl={content.audioUrl}
            segments={stripBlankAnswers(content.segments as BlankSegment[])}
          />
        );
      break;
    case "highlight-incorrect-words":
      if (typeof content.audioUrl === "string" && Array.isArray(content.words))
        return (
          <HighlightWordsPlayer
            questionId={questionId}
            audioUrl={content.audioUrl}
            words={content.words as string[]}
          />
        );
      break;
    case "write-from-dictation":
      if (typeof content.sentence === "string")
        return <DictationPlayer questionId={questionId} sentence={content.sentence} />;
      break;
  }

  return (
    <p className="text-center text-sm text-muted-foreground">
      Chưa hỗ trợ hiển thị nội dung cho dạng câu hỏi này.
    </p>
  );
}
