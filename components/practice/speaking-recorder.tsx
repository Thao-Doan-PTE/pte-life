"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "requesting" | "prep" | "recording" | "done" | "error";

export interface RecordingResult {
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
}

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
  prepSeconds,
  recordSeconds,
  onRecordingComplete,
}: {
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

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      recognitionRef.current?.stop();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      recognitionRef.current?.stop();
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
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6">
      {phase === "idle" && (
        <Button
          size="lg"
          className="gap-2 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          onClick={handleStart}
        >
          <Mic className="size-4" /> Bắt đầu ghi âm
        </Button>
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
            <p className="text-sm font-medium">Đang ghi âm</p>
          </div>
          <p className="text-4xl font-semibold tabular-nums">{countdown}s</p>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleStopEarly}>
            <Square className="size-3.5" /> Dừng sớm
          </Button>
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
