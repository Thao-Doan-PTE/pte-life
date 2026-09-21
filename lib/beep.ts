"use client";

/** Phát 1 tiếng "beep" ngắn bằng Web Audio API — không cần file audio riêng.
 * Dùng làm tín hiệu chuyển giai đoạn (vừa nghe xong câu → chuẩn bị tự động ghi âm). */
export function playBeep(): void {
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => ctx.close();
  } catch {
    // Trình duyệt không hỗ trợ Web Audio API — bỏ qua, không chặn luồng chính.
  }
}
