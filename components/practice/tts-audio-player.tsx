"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts, voiceLabel } from "@/lib/wfd-tts-client";
import { PTE_VOICE_POOL } from "@/lib/azure-tts";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function pickerStyle() {
  return { background: "transparent", color: "var(--wfd-muted)", border: "none" } as const;
}

/** Phát audio bằng text-to-speech (ưu tiên Azure Neural TTS, fallback giọng đọc
 * máy của trình duyệt) thay vì yêu cầu upload sẵn 1 file audio — dùng cho các
 * dạng câu hỏi mà nguồn phát chỉ là 1 câu ngắn tiếng Anh (vd Repeat Sentence).
 * Trình phát đầy đủ: nút play/pause, thanh tua, thời gian, tắt tiếng, tốc độ,
 * chọn giọng — giống chuẩn giao diện tham khảo. */
export function TtsAudioPlayer({
  text,
  autoPlay = true,
  onEnded,
}: {
  text: string;
  /** false để hiện sẵn khung phát (không tách trang) nhưng chưa tự phát —
   * dùng trong lúc đếm ngược "Prepare" ở component cha. */
  autoPlay?: boolean;
  onEnded?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [voiceOverride, setVoiceOverride] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const buildAudio = async (voice: string | null) => {
    const azure = await fetchAzureTts(text, voice ?? undefined);
    if (!azure) return null;
    const audio = new Audio(azure.url);
    audio.playbackRate = playbackRate;
    audio.muted = muted;
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    return audio;
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }
    const audio = await buildAudio(voiceOverride);
    if (!audio) {
      if (!isBrowserTtsSupported()) {
        setUnsupported(true);
        return;
      }
      speakWithBrowserTts(
        text,
        () => {
          setIsPlaying(false);
          onEnded?.();
        },
        0.95 * playbackRate
      );
      setIsPlaying(true);
      return;
    }
    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
  };

  // Đổi giọng thì phải tạo lại audio (giọng khác = file khác).
  const handleVoiceChange = (value: string) => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setVoiceOverride(value || null);
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleSpeedChange = (value: number) => {
    setPlaybackRate(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  };

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  // Tự động phát ngay khi được phép (autoPlay=true, sau khi hết đếm ngược
  // "Prepare" ở component cha) — không cần bấm nút.
  useEffect(() => {
    if (!autoPlay) return;
    const id = setTimeout(() => handlePlayPause(), 0);
    return () => {
      clearTimeout(id);
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={unsupported}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ background: "var(--wfd-red)" }}
        >
          {isPlaying ? (
            <Pause className="size-4" fill="currentColor" />
          ) : (
            <Play className="size-4 translate-x-[1px]" fill="currentColor" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="h-1.5 min-w-[80px] flex-1 accent-[var(--wfd-red)]"
        />

        <span className="wfd-mono shrink-0 text-xs font-semibold" style={{ color: "var(--wfd-muted)" }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button type="button" onClick={handleMuteToggle} className="flex shrink-0 items-center rounded-full border px-2 py-1" style={{ borderColor: "var(--wfd-border)" }}>
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
        <label className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)" }}>
          <select
            className="wfd-mono cursor-pointer appearance-none bg-transparent font-semibold"
            style={pickerStyle()}
            value={playbackRate}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
          >
            {SPEED_OPTIONS.map((r) => (
              <option key={r} value={r}>
                X{r.toFixed(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)" }}>
          <select
            className="wfd-mono cursor-pointer appearance-none bg-transparent font-semibold"
            style={pickerStyle()}
            value={voiceOverride ?? ""}
            onChange={(e) => handleVoiceChange(e.target.value)}
          >
            <option value="">{voiceLabel(null)}</option>
            {PTE_VOICE_POOL.map((v) => (
              <option key={v.name} value={v.name}>
                {voiceLabel(v.name)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isPlaying && (
        <p className="text-xs" style={{ color: "var(--wfd-muted-2)" }}>
          Đang phát câu… hãy lắng nghe cẩn thận.
        </p>
      )}

      {unsupported && (
        <p className="text-xs" style={{ color: "var(--wfd-red-dark)" }}>
          Trình duyệt không hỗ trợ đọc văn bản tự động.
        </p>
      )}
    </div>
  );
}
