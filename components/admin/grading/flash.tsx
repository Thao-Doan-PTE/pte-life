"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Thông báo "một lần" sống qua một lần chuyển trang phía client (router.replace)
 * mà không cần tham số trên URL — nên tải lại trang hay quay lại bằng nút
 * Back/Forward sẽ không hiện lại. Lưu trong bộ nhớ module ở trình duyệt; chỉ ghi
 * từ callback phía client (server luôn thấy null).
 * Thông báo chỉ hiện ở component ĐẦU TIÊN nhận nó; component mount sau (vd. mở
 * lại cùng bài bằng link) không hiện lại. Người dùng nên đặt `key` theo đối tượng
 * (bài làm / dạng bài) để mỗi đối tượng là một lần mount riêng. */

interface Flash {
  key: string;
  message: string;
  owner: object | null;
}

let current: Flash | null = null;
const listeners = new Set<() => void>();

export function setFlash(key: string, message: string) {
  current = { key, message, owner: null };
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = () => null;

function claim(flash: Flash, owner: object) {
  if (flash.owner === null) flash.owner = owner;
}

/** Thông báo đang chờ cho `key` (null = không có / đã hiện ở nơi khác). */
export function useFlashMessage(key: string | null): string | null {
  const [owner] = useState(() => ({}));
  const flash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mine = key !== null && flash !== null && flash.key === key && (flash.owner === null || flash.owner === owner);
  useEffect(() => {
    if (mine && flash) claim(flash, owner);
  }, [mine, flash, owner]);
  return mine && flash ? flash.message : null;
}

export function FlashNotice({ flashKey }: { flashKey: string }) {
  const message = useFlashMessage(flashKey);
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-lg px-3 py-2 text-[13px] font-medium"
      style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }}
    >
      {message}
    </p>
  );
}
