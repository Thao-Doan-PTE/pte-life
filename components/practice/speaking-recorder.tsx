"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "requesting" | "prep" | "recording" | "done" | "error";

export interface RecordingResult {
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
  /** Số lần ngắt quãng (khoảng lặng > MIN_PAUSE_MS) đo bằng phân tích biên độ âm
   * thanh thời gian thực (Web Audio API) trong lúc ghi âm — 0 nếu trình duyệt
   * không hỗ trợ AudioContext. */
  pauseCount: number;
  longestPauseMs: number;
}

const PAUSE_POLL_MS = 100;
const SILENCE_RMS_THRESHOLD = 0.02;
const MIN_PAUSE_MS = 400;

// Web Speech API chưa có type chuẩn trong lib.dom — khai báo tối giản đủ dùng.
interface MinimalSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognition(): MinimalSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function SpeakingRecorderPlayer({
  autoStart = false,
  prepSeconds,
  recordSeconds,
  onRecordingComplete,
}: {
  /** true để tự động bắt đầu ghi âm ngay khi mount (sau tiếng beep), không cần
   * học viên bấm "Nhấn để ghi âm" — đúng luồng thi thật. */
  autoStart?: boolean;
  prepSeconds: number;
  recordSeconds: number;
  onRecordingComplete?: (result: RecordingResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(prepSeconds);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const recordingStartRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pauseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const pauseCountRef = useRef(0);
  const longestPauseMsRef = useRef(0);
  const waveformBarRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const waveformRafRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  /** Đo ngắt quãng bằng RMS biên độ âm thanh thời gian thực — heuristic đơn giản,
   * không phải phân tích ngữ điệu/âm vị học đầy đủ như Versant thật (xem ghi chú
   * trong anthropic-speaking-grader.ts). Coi 1 đoạn im lặng liên tục ≥ MIN_PAUSE_MS
   * là 1 lần ngắt quãng; im lặng ngắn hơn (khoảng dừng tự nhiên giữa các từ) bỏ qua. */
  const startPauseDetection = (stream: MediaStream) => {
    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const audioCtx = new AudioContextCtor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.fftSize);
      pauseCountRef.current = 0;
      longestPauseMsRef.current = 0;
      silenceStartRef.current = null;

      pauseIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const now = Date.now();

        if (rms < SILENCE_RMS_THRESHOLD) {
          if (silenceStartRef.current === null) silenceStartRef.current = now;
        } else if (silenceStartRef.current !== null) {
          const pauseDuration = now - silenceStartRef.current;
          if (pauseDuration >= MIN_PAUSE_MS) {
            pauseCountRef.current += 1;
            longestPauseMsRef.current = Math.max(longestPauseMsRef.current, pauseDuration);
          }
          silenceStartRef.current = null;
        }
      }, PAUSE_POLL_MS);
    } catch {
      // Trình duyệt không hỗ trợ Web Audio API — vẫn chấm được bằng WPM/filler như cũ.
    }
  };

  const stopPauseDetection = () => {
    if (pauseIntervalRef.current) {
      clearInterval(pauseIntervalRef.current);
      pauseIntervalRef.current = null;
    }
    // Nếu đang giữa 1 khoảng lặng lúc dừng ghi âm, tính nốt lần ngắt quãng cuối.
    if (silenceStartRef.current !== null) {
      const pauseDuration = Date.now() - silenceStartRef.current;
      if (pauseDuration >= MIN_PAUSE_MS) {
        pauseCountRef.current += 1;
        longestPauseMsRef.current = Math.max(longestPauseMsRef.current, pauseDuration);
      }
      silenceStartRef.current = null;
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      stopPauseDetection();
      recognitionRef.current?.stop();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vẽ waveform theo âm lượng thực của giọng đang thu (dùng chung analyser
  // với phần đo pauseCount) — cập nhật chiều cao từng thanh trực tiếp qua ref
  // để tránh re-render 60 lần/giây.
  useEffect(() => {
    if (phase !== "recording") return;
    const analyser = analyserRef.current;
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.fftSize);
    const bars = waveformBarRefs.current;
    const chunkSize = Math.floor(dataArray.length / bars.length) || 1;

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      for (let i = 0; i < bars.length; i++) {
        let sumSquares = 0;
        const start = i * chunkSize;
        for (let j = start; j < start + chunkSize; j++) {
          const normalized = (dataArray[j] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / chunkSize);
        const heightPx = 3 + Math.min(1, rms * 6) * 74;
        const bar = bars[i];
        if (bar) bar.style.height = `${heightPx}px`;
      }
      waveformRafRef.current = requestAnimationFrame(draw);
    };
    waveformRafRef.current = requestAnimationFrame(draw);

    return () => {
      if (waveformRafRef.current) cancelAnimationFrame(waveformRafRef.current);
      waveformRafRef.current = null;
    };
  }, [phase]);

  const startSpeechRecognition = () => {
    transcriptRef.current = "";
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const e = event as {
        results: ArrayLike<{ 0: { transcript: string } }>;
      };
      let combined = "";
      for (let i = 0; i < e.results.length; i++) {
        combined += e.results[i][0].transcript + " ";
      }
      transcriptRef.current = combined.trim();
    };
    recognition.onerror = () => {};
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      recognitionRef.current = null;
    }
  };

  const startRecording = (stream: MediaStream) => {
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recordingStartRef.current = Date.now();
    startSpeechRecognition();
    startPauseDetection(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      recognitionRef.current?.stop();
      stopPauseDetection();
      const durationSeconds = Math.round(
        (Date.now() - recordingStartRef.current) / 1000
      );
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setPhase("done");
      stopStream();
      onRecordingComplete?.({
        audioUrl: url,
        transcript: transcriptRef.current,
        durationSeconds,
        pauseCount: pauseCountRef.current,
        longestPauseMs: longestPauseMsRef.current,
      });
    };
    recorderRef.current = recorder;
    recorder.start();
    setPhase("recording");
    setCountdown(recordSeconds);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          recorder.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStart = async () => {
    setErrorMessage(null);
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Nhóm nghe+ghi âm (autoStart, sau tiếng beep) vào ghi âm ngay, không
      // cần đếm "Chuẩn bị" nữa vì học viên đã nghe câu xong. Các dạng bấm nút
      // thủ công (Read Aloud, Describe Image...) vẫn giữ nguyên thời gian
      // chuẩn bị trước khi ghi âm, đúng luật thi thật.
      if (autoStart) {
        startRecording(stream);
        return;
      }

      setPhase("prep");
      setCountdown(prepSeconds);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearTimer();
            startRecording(stream);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setErrorMessage(
        "Không thể truy cập micro. Vui lòng cấp quyền micro cho trình duyệt."
      );
      setPhase("error");
    }
  };

  // Tự động bắt đầu ghi âm ngay khi mount — không cần học viên bấm nút, đúng
  // luồng "sau beep, mic tự bật" của bài thi thật.
  useEffect(() => {
    if (!(autoStart && phase === "idle")) return;
    const id = setTimeout(() => handleStart(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const handleStopEarly = () => {
    clearTimer();
    recorderRef.current?.stop();
  };

  const handleRetry = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setPhase("idle");
    setCountdown(prepSeconds);
  };

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border p-6"
      style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
    >
      {phase === "idle" && (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-sm font-semibold" style={{ color: "var(--wfd-muted)" }}>
            Sẵn sàng ghi âm
          </p>
          <div
            className="relative flex h-16 w-full items-center justify-center gap-1 rounded-lg"
            style={{ background: "var(--wfd-code-bg)" }}
          >
            {Array.from({ length: 32 }).map((_, i) => {
              const ratio = 0.25 + 0.35 * Math.abs(Math.sin(i * 0.9)) + 0.35 * Math.abs(Math.sin(i * 2.3 + 1));
              return (
                <span
                  key={i}
                  className="w-1 shrink-0 rounded-full"
                  style={{ height: `${Math.round(ratio * 40)}px`, background: "var(--wfd-navy)" }}
                />
              );
            })}
            <span
              className="absolute flex size-10 items-center justify-center rounded-full text-white shadow-sm"
              style={{ background: "var(--wfd-red-dark)" }}
            >
              <Mic className="size-5" />
            </span>
          </div>
          <p className="wfd-mono text-xs font-semibold" style={{ color: "var(--wfd-muted)" }}>
            00:00 / {String(recordSeconds).padStart(2, "0")}s
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-sm font-bold text-white"
            style={{ background: "var(--wfd-red-dark)" }}
          >
            <Mic className="size-4" /> Nhấn để ghi âm
          </button>
        </div>
      )}

      {phase === "requesting" && (
        <p className="text-sm text-muted-foreground">Đang xin quyền micro...</p>
      )}

      {phase === "prep" && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted-foreground">Chuẩn bị</p>
          <p className="text-4xl font-semibold tabular-nums">{countdown}s</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#b81620" }}>
            <Mic className="size-4" />
            Đang ghi âm... Hãy nói vào microphone chính xác câu bạn vừa nghe!
          </p>
          <div
            className="flex h-20 w-full items-center justify-center gap-[3px] rounded-lg"
            style={{ background: "var(--wfd-code-bg)" }}
          >
            {Array.from({ length: 64 }).map((_, i) => (
              <span
                key={i}
                ref={(el) => {
                  waveformBarRefs.current[i] = el;
                }}
                className="w-0.5 shrink-0 rounded-full bg-black transition-[height] duration-75"
                style={{ height: "3px" }}
              />
            ))}
          </div>
          <p className="text-xs font-semibold" style={{ color: "var(--wfd-muted)" }}>
            Đang ghi âm câu trả lời của bạn — còn {countdown} giây.
          </p>
          <button
            type="button"
            onClick={handleStopEarly}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border px-6 py-3 text-sm font-bold"
            style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
          >
            <Square className="size-4" /> Dừng ghi âm
          </button>
        </div>
      )}

      {phase === "done" && audioUrl && (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-sm font-medium">Nghe lại bài ghi âm của bạn</p>
          <audio controls src={audioUrl} className="w-full" />
          <Button variant="outline" size="sm" className="gap-1" onClick={handleRetry}>
            <RotateCcw className="size-3.5" /> Ghi âm lại
          </Button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Thử lại
          </Button>
        </div>
      )}
    </div>
  );
}
