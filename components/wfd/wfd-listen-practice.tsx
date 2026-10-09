"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Eye,
  EyeOff,
  Gauge,
  Headphones,
  Languages,
  List,
  Mic2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts } from "@/lib/wfd-tts-client";
import { PTE_VOICE_POOL } from "@/lib/azure-tts";

const SPEED_OPTIONS = [0.75, 0.9, 1, 1.1, 1.25];

function voiceLabel(voiceName: string | null): string {
  if (!voiceName) return "Ngẫu nhiên (xoay vòng theo đề thi thật)";
  const voice = PTE_VOICE_POOL.find((v) => v.name === voiceName);
  if (!voice) return voiceName;
  return `${voice.gender === "female" ? "Nữ" : "Nam"} (${voice.accent})`;
}

function formatRemaining(totalSec: number): string {
  if (totalSec < 60) return `${Math.round(totalSec)} giây`;
  const totalMin = Math.round(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

function formatClipTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

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
const PAUSE_OPTIONS = [0, 1, 2, 3, 5];

function PillRow<T extends number>({
  options,
  value,
  onChange,
  format,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl p-0.5 sm:gap-1 sm:p-1" style={{ background: "var(--wfd-code-bg)" }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="flex-1 rounded-lg px-1 py-1.5 text-[13px] font-bold transition-colors sm:px-2 sm:py-2 sm:text-[15px]"
          style={value === opt ? { background: "var(--wfd-red)", color: "#ffffff" } : { color: "var(--wfd-ink)" }}
        >
          {format(opt)}
        </button>
      ))}
    </div>
  );
}

function selectClassName() {
  return "w-full appearance-none rounded-xl border px-3.5 py-2.5 text-[15px] font-medium";
}

function selectStyle() {
  return { borderColor: "var(--wfd-border)", background: "var(--wfd-surface)", color: "var(--wfd-ink)" };
}

export function WfdListenPractice({
  questions,
  backHref,
  typeName,
  typeCode,
}: {
  questions: WfdListenQuestion[];
  backHref: string;
  typeName: string;
  typeCode: string;
}) {
  const total = questions.length;
  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [fromNum, setFromNum] = useState(1);
  const [toNum, setToNum] = useState(total);
  const [repeatEach, setRepeatEach] = useState(3);
  const [pauseSec, setPauseSec] = useState(2);
  const [showText, setShowText] = useState(true);
  const [voiceOverride, setVoiceOverride] = useState<string | null>("en-AU-NatashaNeural");
  const [playbackRate, setPlaybackRate] = useState(1);

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [pos, setPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const pendingNextIdxRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<number | null>(null);
  const playlistRef = useRef<PlaylistItem[]>([]);
  const pauseSecRef = useRef(pauseSec);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceByQuestionRef = useRef<Map<string, string>>(new Map());
  const voiceOverrideRef = useRef<string | null>(null);
  const playbackRateRef = useRef(1);

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
    setElapsedSec(0);
    setDurationSec(0);
    const item = list[idx];

    // Chọn giọng theo thứ tự ưu tiên: giọng cố định do học viên chọn > giữ
    // nguyên giọng cho các lần lặp của cùng 1 câu > xoay vòng ngẫu nhiên
    // (mô phỏng cách đề thi PTE thật đổi giọng đọc giữa các speaker).
    const reuseVoice = voiceByQuestionRef.current.get(item.id);
    const voiceToUse = voiceOverrideRef.current ?? reuseVoice;
    const azure = await fetchAzureTts(item.sentence, voiceToUse ?? undefined);
    if (cancelledRef.current) return;

    if (azure) {
      if (!reuseVoice) voiceByQuestionRef.current.set(item.id, azure.voiceName);
      setCurrentVoice(azure.voiceName);
      if (pausedRef.current) {
        pendingNextIdxRef.current = idx;
        return;
      }
      const audio = new Audio(azure.url);
      audio.playbackRate = playbackRateRef.current;
      currentAudioRef.current = audio;
      audio.ontimeupdate = () => setElapsedSec(audio.currentTime);
      audio.onloadedmetadata = () => setDurationSec(audio.duration || 0);
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
    setCurrentVoice(null);
    speakWithBrowserTts(item.sentence, () => scheduleNext(idx), 0.95 * playbackRateRef.current);
  }

  async function handlePreviewVoice() {
    const sample = "This is a preview of the selected voice.";
    const azure = await fetchAzureTts(sample, voiceOverride ?? undefined);
    if (azure) {
      new Audio(azure.url).play();
      return;
    }
    if (isBrowserTtsSupported()) {
      speakWithBrowserTts(sample, () => {});
    }
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
    voiceOverrideRef.current = voiceOverride;
    playbackRateRef.current = playbackRate;
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

  function stopCurrentPlayback() {
    if (timeoutIdRef.current) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    window.speechSynthesis?.cancel();
    pendingNextIdxRef.current = null;
  }

  function handleSkipNext() {
    stopCurrentPlayback();
    pausedRef.current = false;
    setIsPaused(false);
    playAt(pos + 1);
  }

  function handleSkipPrev() {
    stopCurrentPlayback();
    pausedRef.current = false;
    setIsPaused(false);
    playAt(Math.max(0, pos - 1));
  }

  function setLivePauseSec(v: number) {
    setPauseSec(v);
    pauseSecRef.current = v;
  }

  function setLivePlaybackRate(v: number) {
    setPlaybackRate(v);
    playbackRateRef.current = v;
    if (currentAudioRef.current) currentAudioRef.current.playbackRate = v;
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
    <div className="wfd-force-light relative overflow-hidden">

      <div className="relative mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:gap-6 sm:px-10 sm:py-8">
        {phase === "playing" && currentItem ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--wfd-border)" }}>
            <button
              type="button"
              onClick={handleStop}
              className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold"
              style={{ color: "var(--wfd-ink)" }}
            >
              <ArrowLeft className="size-4" /> Quay lại cài đặt chế độ luyện nghe
            </button>
            <div className="flex items-center gap-2">
              {typeCode && (
                <span
                  className="flex shrink-0 items-center justify-center rounded-lg px-2 py-1 text-[13px] font-extrabold text-white"
                  style={{ background: "var(--wfd-red)" }}
                >
                  {typeCode}
                </span>
              )}
              <p className="text-[15px] font-bold tracking-wide uppercase" style={{ color: "var(--wfd-ink)" }}>
                {typeName}
              </p>
            </div>
          </div>
        ) : (
          <>
            <Link
              href={backHref}
              className="flex w-fit items-center gap-1.5 text-[13px] font-medium sm:gap-2 sm:text-[15px]"
              style={{ color: "var(--wfd-muted)" }}
            >
              <ArrowLeft className="size-3.5 sm:size-4" /> Quay lại danh sách
            </Link>

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="shrink-0" style={{ color: "var(--wfd-red)" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-10 sm:size-14" aria-hidden="true">
                    <path d="M5 2h9l5 5v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                    <path d="M14 2v4a1 1 0 0 0 1 1h4z" fill="var(--wfd-red-tint)" />
                    <rect x="3" y="12" width="16" height="6" rx="1" fill="var(--wfd-red-tint)" />
                    <text
                      x="11"
                      y="16.8"
                      textAnchor="middle"
                      fontSize="5"
                      fontWeight="800"
                      fill="currentColor"
                      fontFamily="sans-serif"
                    >
                      MP3
                    </text>
                  </svg>
                </div>
                <div>
                  <h1 className="text-[20px] font-bold sm:text-[28px]" style={{ color: "var(--wfd-black-sem)" }}>
                    Chế độ luyện nghe
                  </h1>
                  <p className="mt-0.5 text-[13px] sm:mt-1 sm:text-[15px]" style={{ color: "var(--wfd-muted)" }}>
                    Chọn để cấu hình chế độ nghe theo đúng nhu cầu của bạn.
                  </p>
                </div>
              </div>

              <div
                className="pointer-events-none hidden -rotate-6 items-center gap-2 sm:flex"
                style={{ color: "var(--wfd-red)" }}
                aria-hidden="true"
              >
                <span className="font-serif text-[20px] leading-tight italic">
                  Listen
                  <br />
                  to improve
                </span>
                <Headphones className="size-10 shrink-0" />
              </div>
            </div>
          </>
        )}

        <div
          className="relative rounded-2xl border p-4 sm:p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
        {phase === "setup" && (
          <div className="flex flex-col gap-3 sm:gap-6">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-6">
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold sm:mb-1.5 sm:text-[15px]">
                  <List className="size-3.5 sm:size-4" /> Phạm vi câu
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    type="number"
                    min={1}
                    max={total}
                    value={fromNum}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setFromNum(Number.isFinite(n) ? Math.min(Math.max(1, n), total) : 1);
                    }}
                    className="w-14 rounded-lg px-2 py-1.5 text-center text-[15px] font-bold sm:w-16 sm:py-2"
                    style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
                  />
                  <span className="text-[15px] font-bold" style={{ color: "var(--wfd-muted)" }}>
                    →
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={total}
                    value={toNum}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setToNum(Number.isFinite(n) ? Math.min(Math.max(1, n), total) : total);
                    }}
                    className="w-14 rounded-lg px-2 py-1.5 text-center text-[15px] font-bold sm:w-16 sm:py-2"
                    style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFromNum(1);
                      setToNum(total);
                    }}
                    className="text-[15px] font-bold"
                    style={{ color: "var(--wfd-red)" }}
                  >
                    Tất cả
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold sm:mb-1.5 sm:text-[15px]">
                  <Repeat className="size-3.5 sm:size-4" /> Số lần lặp
                </label>
                <PillRow options={REPEAT_OPTIONS} value={repeatEach} onChange={setRepeatEach} format={(n) => `${n}`} />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold sm:mb-1.5 sm:text-[15px]">
                  <Clock className="size-3.5 sm:size-4" /> Khoảng dừng
                </label>
                <PillRow options={PAUSE_OPTIONS} value={pauseSec} onChange={setPauseSec} format={(n) => `${n}s`} />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold sm:mb-1.5 sm:text-[15px]">
                  <Mic2 className="size-3.5 sm:size-4" /> Giọng đọc
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <select
                    className={selectClassName()}
                    style={selectStyle()}
                    value={voiceOverride ?? ""}
                    onChange={(e) => setVoiceOverride(e.target.value || null)}
                  >
                    <option value="">{voiceLabel(null)}</option>
                    {PTE_VOICE_POOL.map((v) => (
                      <option key={v.name} value={v.name}>
                        {voiceLabel(v.name)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handlePreviewVoice}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
                    style={selectStyle()}
                    aria-label="Nghe thử giọng đọc"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold sm:mb-1.5 sm:text-[15px]">
                  <Gauge className="size-3.5 sm:size-4" /> Tốc độ đọc
                </label>
                <PillRow options={SPEED_OPTIONS} value={playbackRate} onChange={setPlaybackRate} format={(r) => `${r}x`} />
              </div>

              <div className="hidden sm:block">
                <label className="mb-1.5 flex items-center gap-1.5 text-[15px] font-semibold">
                  <Languages className="size-4" /> Dịch tiếng Việt
                </label>
                <div
                  className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5"
                  style={{ background: "var(--wfd-code-bg)" }}
                >
                  <span className="text-[15px] font-medium">Hiện nghĩa dưới câu</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showText}
                    onClick={() => setShowText((v) => !v)}
                    className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                    style={{ background: showText ? "var(--wfd-red)" : "var(--wfd-border)" }}
                  >
                    <span
                      className="absolute top-0.5 size-4 rounded-full bg-white transition-[left]"
                      style={{ left: showText ? "18px" : "2px" }}
                    />
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 sm:hidden">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Languages className="size-3.5" /> Hiện nghĩa dưới câu
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showText}
                onClick={() => setShowText((v) => !v)}
                className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                style={{ background: showText ? "var(--wfd-red)" : "var(--wfd-border)" }}
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full bg-white transition-[left]"
                  style={{ left: showText ? "18px" : "2px" }}
                />
              </button>
            </label>

            <div
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 sm:gap-3 sm:pt-5"
              style={{ borderColor: "var(--wfd-border)" }}
            >
              {validRange && questionCount > 0 ? (
                <div>
                  <p className="text-[13px] font-bold sm:text-[15px]">
                    {questionCount} câu × {repeatEach} lần ={" "}
                    <span style={{ color: "var(--wfd-red)" }}>{totalListens} lượt nghe</span>
                  </p>
                  <p className="mt-1 text-xs sm:mt-1.5 sm:text-[13px]" style={{ color: "var(--wfd-muted)" }}>
                    Câu {fromNum} → {toNum} · khoảng {formatRemaining(totalListens * (4 + pauseSec))}
                  </p>
                </div>
              ) : (
                <p className="text-[13px] font-medium sm:text-[15px]" style={{ color: "var(--wfd-red-dark)" }}>
                  Phạm vi không hợp lệ — &quot;Từ câu&quot; phải nhỏ hơn hoặc bằng &quot;Đến câu&quot;.
                </p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={!validRange || questionCount === 0}
                className="flex w-fit items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold text-white shadow-sm disabled:opacity-60 sm:px-5 sm:text-[15px]"
                style={{ background: "var(--wfd-red)" }}
              >
                <Play className="size-4" fill="currentColor" /> Bắt đầu luyện nghe
              </button>
            </div>
          </div>
        )}

        {phase === "playing" && currentItem && (
          <div
            className="flex flex-col gap-5 rounded-2xl p-5"
            style={{ background: "#12172a", color: "#f5f5f7" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--wfd-red)", color: "#ffffff" }}
                >
                  <Headphones className="size-5" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-bold">Walkman Mode</p>
                  <p className="text-[13px]" style={{ color: "#9ca3af" }}>
                    Nghe liên tục, tập trung vào âm thanh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowText((v) => !v)}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold"
                style={{ background: "#1b2140", color: "#f5f5f7" }}
              >
                {showText ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showText ? "Ẩn text" : "Hiện text"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="wfd-mono rounded-full px-3 py-1 text-[13px] font-bold"
                style={{ background: "#1b2140", color: "#f5f5f7" }}
              >
                Câu {currentItem.qNum}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[13px] font-bold"
                style={{ background: "var(--wfd-red)", color: "#ffffff" }}
              >
                Lần {currentItem.repIndex}/{repeatEach}
              </span>
            </div>

            <div className="flex items-center justify-between text-[13px]" style={{ color: "#9ca3af" }}>
              <span>
                Lượt <strong style={{ color: "#f5f5f7" }}>{pos}</strong> / {playlist.length}
              </span>
              <span>
                Còn khoảng{" "}
                <strong style={{ color: "#f5f5f7" }}>
                  {formatRemaining(
                    Math.max(0, playlist.length - (pos + 1)) * ((durationSec || 3) + pauseSec)
                  )}
                </strong>
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#1b2140" }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${overallRatio * 100}%`, background: "var(--wfd-red)" }}
              />
            </div>

            <div className="rounded-xl p-4 text-center" style={{ background: "#1b2140" }}>
              <p
                className="font-passage text-[20px] leading-relaxed font-medium transition-[filter,opacity] duration-300"
                style={showText ? undefined : { filter: "blur(6px)", opacity: 0.6 }}
              >
                {currentItem.sentence}
              </p>
              {currentItem.sentenceVi && (
                <p
                  className="mt-1 text-[15px] transition-[filter,opacity] duration-300"
                  style={{ color: "#9ca3af", ...(showText ? {} : { filter: "blur(6px)", opacity: 0.6 }) }}
                >
                  {currentItem.sentenceVi}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-5">
              <Shuffle className="size-4" style={{ color: "#5b6272" }} aria-hidden="true" />
              <button
                type="button"
                onClick={handleSkipPrev}
                disabled={pos === 0}
                className="flex size-9 items-center justify-center rounded-full disabled:opacity-40"
                style={{ color: "#f5f5f7" }}
                aria-label="Câu trước"
              >
                <SkipBack className="size-5" fill="currentColor" />
              </button>
              <button
                type="button"
                onClick={togglePause}
                className="flex size-14 shrink-0 items-center justify-center rounded-full"
                style={{ background: "#ffffff", color: "#12172a" }}
                aria-label={isPaused ? "Tiếp tục" : "Tạm dừng"}
              >
                {isPaused ? (
                  <Play className="size-6 translate-x-[1px]" fill="currentColor" />
                ) : (
                  <Pause className="size-6" fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipNext}
                className="flex size-9 items-center justify-center rounded-full"
                style={{ color: "#f5f5f7" }}
                aria-label="Câu tiếp theo"
              >
                <SkipForward className="size-5" fill="currentColor" />
              </button>
              <Repeat className="size-4" style={{ color: "var(--wfd-red)" }} aria-hidden="true" />
            </div>

            <div className="flex items-center justify-between text-[13px]" style={{ color: "#9ca3af" }}>
              <span className="wfd-mono">
                {formatClipTime(elapsedSec)} / {formatClipTime(durationSec)}
              </span>
              <span>Giọng đọc: {voiceLabel(currentVoice)}</span>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "#242b45" }}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "#9ca3af" }}>
                  Nghỉ
                </span>
                <div className="flex items-center gap-1">
                  {PAUSE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLivePauseSec(n)}
                      className="rounded-full px-2.5 py-1 text-[13px] font-bold"
                      style={
                        pauseSec === n
                          ? { background: "#ffffff", color: "#12172a" }
                          : { color: "#9ca3af" }
                      }
                    >
                      {n}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "#9ca3af" }}>
                  Tốc độ
                </span>
                <div className="flex items-center gap-1">
                  {SPEED_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLivePlaybackRate(r)}
                      className="rounded-full px-2.5 py-1 text-[13px] font-bold"
                      style={
                        playbackRate === r
                          ? { background: "#ffffff", color: "#12172a" }
                          : { color: "#9ca3af" }
                      }
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>
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
            <p className="text-[20px] font-bold">Đã hoàn thành!</p>
            <p className="text-[15px]" style={{ color: "var(--wfd-muted)" }}>
              Bạn vừa nghe {playlist.length} lượt qua {questionCount} câu.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-[15px] font-bold"
                style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
              >
                <RotateCcw className="size-4" /> Nghe lại
              </button>
              <button
                type="button"
                onClick={() => setPhase("setup")}
                className="rounded-[10px] border px-6 py-2.5 text-[15px] font-bold"
                style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
              >
                Đổi cài đặt
              </button>
              <Link
                href={backHref}
                className="rounded-[10px] border px-6 py-2.5 text-[15px] font-bold"
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
