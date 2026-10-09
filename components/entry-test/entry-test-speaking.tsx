"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import type { ReadAloudQuestion } from "@/lib/entry-test-data";
import { uploadEntryTestAudioAction } from "@/lib/actions/entry-test-attempt";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function EntryTestSpeaking({
  attemptId,
  question,
  hasRecording,
  onRecorded,
}: {
  attemptId: string;
  question: ReadAloudQuestion;
  hasRecording: boolean;
  onRecorded: (audioUrl: string, previewUrl: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function uploadBlob(blob: Blob, mimeType: string) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      const ext = mimeType.includes("mp3") || mimeType.includes("mpeg") ? "mp3" : mimeType.includes("wav") ? "wav" : "webm";
      formData.append("audio", blob, `recording.${ext}`);
      const res = await uploadEntryTestAudioAction(attemptId, formData);
      if (res.ok && res.audioUrl) {
        const localPreview = URL.createObjectURL(blob);
        setPreviewUrl(localPreview);
        onRecorded(res.audioUrl, localPreview);
      } else {
        setError(res.error ?? "Không thể lưu bài ghi âm. Thử lại sau.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: mimeType });
        void uploadBlob(blob, mimeType);
      };
      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= question.answerSeconds) {
            recorder.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("Không mở được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  return (
    <div>
      <p className="m-0 mb-1 text-[15px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
        {question.instructionEn} <span style={{ color: "var(--rail-red)" }}>({question.points}đ)</span>
      </p>
      <p className="m-0 mb-3 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
        {question.instructionVi}
      </p>
      <blockquote className="m-0 mb-4 rounded-lg p-4 font-passage text-[17px] leading-relaxed not-italic" style={{ background: "#f3f5f7", color: "var(--rail-ink)" }}>
        “{question.text}”
      </blockquote>

      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-6"
        style={{ background: "#f7f8f9", borderColor: "#dfe3e8" }}
      >
        <div className="flex items-center justify-center gap-[3px]" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => (
            <span key={i} className="size-[3px] shrink-0 rounded-full" style={{ background: "#dfe3e8" }} />
          ))}
        </div>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          aria-label={recording ? "Dừng ghi âm" : "Nhấn để ghi âm"}
          className="flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
          style={{ background: "var(--rail-red)" }}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : recording ? (
            <Square className="size-5" fill="currentColor" />
          ) : (
            <Mic className="size-6" />
          )}
        </button>
        <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          {recording
            ? "Đang ghi âm... nhấn nút để dừng"
            : uploading
              ? "Đang lưu bài ghi âm..."
              : hasRecording
                ? "Nhấn nút micro để ghi âm lại"
                : "Nhấn nút micro để bắt đầu"}
        </p>
        <span className="font-mono text-[15px] tabular-nums" style={{ color: "var(--rail-ink-dim)" }}>
          {formatClock(recording ? elapsed : 0)} / {formatClock(question.answerSeconds)}
        </span>
      </div>

      {error && (
        <p className="m-0 mt-2 text-[15px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
          {error}
        </p>
      )}

      {previewUrl && !recording && (
        <div className="mt-3">
          <audio controls src={previewUrl} className="w-full" />
          <p className="m-0 mt-1 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
            Đã lưu bài ghi âm. Bạn có thể ghi lại nếu muốn.
          </p>
        </div>
      )}
      {!previewUrl && hasRecording && (
        <p className="m-0 mt-3 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
          Đã có bài ghi âm được lưu từ trước.
        </p>
      )}
    </div>
  );
}
