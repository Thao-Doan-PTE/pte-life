"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileText,
  Headphones,
  List,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Square,
} from "lucide-react";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts } from "@/lib/wfd-tts-client";

interface WfdListenQuestion {
  id: string;
  sentence: string;
  sentenceVi: string | null;
}

interface PlaylistItem {
  id: string;
  sentence: string;
  sentenceVi: string | null;
  qNum: number;
  repIndex: number;
}

const REPEAT_OPTIONS = [1, 2, 3, 4, 5];
const PAUSE_OPTIONS = [1, 2, 3, 5];

function selectClassName() {
  return "w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm font-medium";
}

function selectStyle() {
  return { borderColor: "var(--wfd-border)", background: "var(--wfd-surface)", color: "var(--wfd-ink)" };
}

export function WfdListenPractice({ questions }: { questions: WfdListenQuestion[] }) {
  const total = questions.length;
  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [fromNum, setFromNum] = useState(1);
  const [toNum, setToNum] = useState(total);
  const [repeatEach, setRepeatEach] = useState(3);
  const [pauseSec, setPauseSec] = useState(2);
  const [showText, setShowText] = useState(true);

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [pos, setPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const pendingNextIdxRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<number | null>(null);
  const playlistRef = useRef<PlaylistItem[]>([]);
  const pauseSecRef = useRef(pauseSec);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceByQuestionRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timeoutIdRef.current) window.clearTimeout(timeoutIdRef.current);
      currentAudioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const validRange = fromNum <= toNum;
  const questionCount = validRange ? toNum - fromNum + 1 : 0;
  const totalListens = questionCount * repeatEach;

  function scheduleNext(idx: number) {
    if (cancelledRef.current) return;
    if (pausedRef.current) {
      pendingNextIdxRef.current = idx + 1;
      return;
    }
    timeoutIdRef.current = window.setTimeout(() => {
      if (cancelledRef.current) return;
      if (pausedRef.current) {
        pendingNextIdxRef.current = idx + 1;
        return;
      }
      playAt(idx + 1);
    }, pauseSecRef.current * 1000);
  }

  async function playAt(idx: number) {
    const list = playlistRef.current;
    if (idx >= list.length) {
      setPhase("done");
      return;
    }
    setPos(idx);
    const item = list[idx];

    // Giữ nguyên giọng cho các lần lặp của cùng 1 câu, đổi giọng khi sang câu mới
    // (mô phỏng cách đề thi PTE thật xoay vòng giọng đọc giữa các speaker).
    const reuseVoice = voiceByQuestionRef.current.get(item.id);
    const azure = await fetchAzureTts(item.sentence, reuseVoice);
    if (cancelledRef.current) return;

    if (azure) {
      if (!reuseVoice) voiceByQuestionRef.current.set(item.id, azure.voiceName);
      if (pausedRef.current) {
        pendingNextIdxRef.current = idx;
        return;
      }
      const audio = new Audio(azure.url);
      currentAudioRef.current = audio;
      audio.onended = () => scheduleNext(idx);
      audio.play();
      return;
    }

    if (!isBrowserTtsSupported()) {
      setPhase("done");
      return;
    }
    if (pausedRef.current) {
      pendingNextIdxRef.current = idx;
      return;
    }
    speakWithBrowserTts(item.sentence, () => scheduleNext(idx));
  }

  function handleStart() {
    if (!validRange || questionCount === 0) return;
    const list: PlaylistItem[] = [];
    for (let i = fromNum - 1; i <= toNum - 1; i++) {
      const q = questions[i];
      for (let r = 0; r < repeatEach; r++) {
        list.push({ id: q.id, sentence: q.sentence, sentenceVi: q.sentenceVi, qNum: i + 1, repIndex: r + 1 });
      }
    }
    cancelledRef.current = false;
    pausedRef.current = false;
    pendingNextIdxRef.current = null;
    pauseSecRef.current = pauseSec;
    voiceByQuestionRef.current = new Map();
    playlistRef.current = list;
    setPlaylist(list);
    setIsPaused(false);
    setPhase("playing");
    playAt(0);
  }

  function togglePause() {
    if (!pausedRef.current) {
      pausedRef.current = true;
      setIsPaused(true);
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
        pendingNextIdxRef.current = pos + 1;
      }
      const audio = currentAudioRef.current;
      if (audio && !audio.paused && !audio.ended) {
        audio.pause();
      } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    } else {
      pausedRef.current = false;
      setIsPaused(false);
      const audio = currentAudioRef.current;
      if (audio && audio.paused && !audio.ended && audio.currentTime > 0) {
        audio.play();
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else if (pendingNextIdxRef.current != null) {
        const next = pendingNextIdxRef.current;
        pendingNextIdxRef.current = null;
        playAt(next);
      }
    }
  }

  function handleStop() {
    cancelledRef.current = true;
    pausedRef.current = false;
    pendingNextIdxRef.current = null;
    if (timeoutIdRef.current) window.clearTimeout(timeoutIdRef.current);
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setPhase("setup");
  }

  function handleRestart() {
    handleStart();
  }

  const currentItem = playlist[pos];
  const overallRatio = playlist.length > 0 ? (pos + 1) / playlist.length : 0;

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-16 -left-16 size-64 rounded-full opacity-60"
        style={{ background: "var(--wfd-red-tint)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-20 size-72 rounded-full opacity-50"
        style={{ background: "var(--wfd-red-tint)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full opacity-40"
        style={{ background: "var(--wfd-red-tint)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-8 sm:px-10">
        <Link
          href="/practice/listening/write-from-dictation"
          className="flex w-fit items-center gap-2 text-sm font-medium"
          style={{ color: "var(--wfd-muted)" }}
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách
        </Link>

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red)" }}
            >
              <Headphones className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-[28px]">
                <span style={{ color: "var(--wfd-black-sem)" }}>Luyện</span>{" "}
                <span style={{ color: "var(--wfd-red)" }}>nghe</span>
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--wfd-muted)" }}>
                Phát audio liên tục, không cần gõ. Tập trung vào lắng nghe.
              </p>
            </div>
          </div>

          <div
            className="pointer-events-none hidden -rotate-6 items-center gap-2 sm:flex"
            style={{ color: "var(--wfd-red)" }}
            aria-hidden="true"
          >
            <span className="font-serif text-lg leading-tight italic">
              Listen
              <br />
              to improve
            </span>
            <Headphones className="size-10 shrink-0" />
          </div>
        </div>

        <div
          className="relative rounded-2xl border p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
        {phase === "setup" && (
          <div className="flex flex-col gap-6">
            <div
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: "var(--wfd-red-tint)" }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--wfd-red)", color: "#ffffff" }}
              >
                <Headphones className="size-5" />
              </div>
              <div>
                <p className="text-base font-bold">Chế độ Luyện nghe</p>
                <p className="text-sm" style={{ color: "var(--wfd-muted)" }}>
                  Chỉ nghe, không cần gõ. Chọn phạm vi câu và số lần lặp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="size-4" /> Từ câu
                </label>
                <select
                  className={selectClassName()}
                  style={selectStyle()}
                  value={fromNum}
                  onChange={(e) => setFromNum(Number(e.target.value))}
                >
                  {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Câu {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <List className="size-4" /> Đến câu
                </label>
                <select
                  className={selectClassName()}
                  style={selectStyle()}
                  value={toNum}
                  onChange={(e) => setToNum(Number(e.target.value))}
                >
                  {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Câu {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Repeat className="size-4" /> Số lần lặp mỗi câu
                </label>
                <select
                  className={selectClassName()}
                  style={selectStyle()}
                  value={repeatEach}
                  onChange={(e) => setRepeatEach(Number(e.target.value))}
                >
                  {REPEAT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} lần
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:w-1/3">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="size-4" /> Khoảng dừng giữa các lần đọc
              </label>
              <select
                className={selectClassName()}
                style={selectStyle()}
                value={pauseSec}
                onChange={(e) => setPauseSec(Number(e.target.value))}
              >
                {PAUSE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} giây
                  </option>
                ))}
              </select>
            </div>

            <label
              className="flex items-center gap-3 rounded-xl border p-4"
              style={{ borderColor: "var(--wfd-red-tint-border)", background: "var(--wfd-red-tint)" }}
            >
              <input
                type="checkbox"
                checked={showText}
                onChange={(e) => setShowText(e.target.checked)}
                className="size-5 shrink-0 accent-current"
                style={{ color: "var(--wfd-red)" }}
              />
              <span className="text-sm">
                <span className="font-bold">Dịch tiếng Việt</span>{" "}
                <span style={{ color: "var(--wfd-muted)" }}>
                  Hiện nội dung câu và bản dịch tiếng Việt trong khi phát
                </span>
              </span>
            </label>

            <div
              className="flex items-start gap-2 rounded-xl p-4 text-sm"
              style={{ background: "var(--wfd-surface-2)", color: "var(--wfd-ink)" }}
            >
              <FileText className="mt-0.5 size-4 shrink-0" style={{ color: "var(--wfd-muted-2)" }} />
              {validRange && questionCount > 0 ? (
                <span>
                  Sẽ phát <strong>{questionCount} câu</strong> (câu {fromNum} → {toNum}), mỗi câu{" "}
                  <strong>{repeatEach} lần</strong>. Tổng cộng <strong>{totalListens} lượt nghe</strong>.
                </span>
              ) : (
                <span style={{ color: "var(--wfd-red-dark)" }}>
                  Phạm vi không hợp lệ — &quot;Từ câu&quot; phải nhỏ hơn hoặc bằng &quot;Đến câu&quot;.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={!validRange || questionCount === 0}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-base font-bold shadow-sm disabled:opacity-60"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
            >
              <Play className="size-5" fill="currentColor" /> Bắt đầu
            </button>
          </div>
        )}

        {phase === "playing" && currentItem && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className="wfd-mono rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
              >
                Câu {currentItem.qNum}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
              >
                Lần {currentItem.repIndex}/{repeatEach}
              </span>
              <span className="text-xs" style={{ color: "var(--wfd-muted)" }}>
                {pos + 1}/{playlist.length} lượt nghe
              </span>
            </div>

            <div
              className="h-2 w-full max-w-md overflow-hidden rounded-full"
              style={{ background: "var(--wfd-border)" }}
            >
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${overallRatio * 100}%`, background: "var(--wfd-red)" }}
              />
            </div>

            <div
              className="flex size-20 items-center justify-center rounded-full"
              style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
            >
              <Headphones className="size-9" />
            </div>

            {showText ? (
              <div className="flex max-w-lg flex-col gap-2">
                <p className="text-lg leading-relaxed font-medium">{currentItem.sentence}</p>
                {currentItem.sentenceVi && (
                  <p className="text-sm" style={{ color: "var(--wfd-muted)" }}>
                    {currentItem.sentenceVi}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--wfd-muted)" }}>
                Đang phát âm thanh — tập trung lắng nghe...
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-bold text-white"
                style={{ background: "var(--wfd-red)" }}
              >
                {isPaused ? (
                  <>
                    <Play className="size-4" fill="currentColor" /> Tiếp tục
                  </>
                ) : (
                  <>
                    <Pause className="size-4" fill="currentColor" /> Tạm dừng
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 rounded-[10px] border px-6 py-2.5 text-sm font-bold"
                style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
              >
                <Square className="size-4" /> Dừng & quay lại cài đặt
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="flex size-14 items-center justify-center rounded-full"
              style={{ background: "var(--wfd-green-tint)", color: "var(--wfd-green)" }}
            >
              <Headphones className="size-7" />
            </div>
            <p className="text-lg font-bold">Đã hoàn thành!</p>
            <p className="text-sm" style={{ color: "var(--wfd-muted)" }}>
              Bạn vừa nghe {playlist.length} lượt qua {questionCount} câu.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-bold"
                style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
              >
                <RotateCcw className="size-4" /> Nghe lại
              </button>
              <button
                type="button"
                onClick={() => setPhase("setup")}
                className="rounded-[10px] border px-6 py-2.5 text-sm font-bold"
                style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
              >
                Đổi cài đặt
              </button>
              <Link
                href="/practice/listening/write-from-dictation"
                className="rounded-[10px] border px-6 py-2.5 text-sm font-bold"
                style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
              >
                Quay lại danh sách câu hỏi
              </Link>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
