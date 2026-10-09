"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";

type BeforeAdvance = () => Promise<void> | void;

interface ExamAdvanceApi {
  setHandler: (fn: BeforeAdvance | null) => void;
  getHandler: () => BeforeAdvance | null;
}

const ExamAdvanceContext = createContext<ExamAdvanceApi | null>(null);

/** Bọc quanh khu vực nội dung câu hỏi trong Mock Test — cho phép player con
 * (vd Speaking, cần chấm điểm AI bất đồng bộ trước khi chuyển câu) đăng ký 1
 * hàm chạy ngay trước khi nút "Next" thật sự submit, mà không cần hiện nút
 * "Nộp bài" riêng như bản luyện tập thường (đúng luồng "giao diện thi thật"). */
export function ExamAdvanceProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<BeforeAdvance | null>(null);
  const api = useMemo<ExamAdvanceApi>(
    () => ({
      setHandler: (fn) => {
        handlerRef.current = fn;
      },
      getHandler: () => handlerRef.current,
    }),
    []
  );
  return <ExamAdvanceContext.Provider value={api}>{children}</ExamAdvanceContext.Provider>;
}

/** Gọi trong player con: đăng ký hàm sẽ chạy ngay trước khi Next submit (vd
 * chấm điểm AI). Truyền `null` nếu chưa có gì cần chạy (vd chưa ghi âm xong). */
export function useRegisterBeforeAdvance(fn: BeforeAdvance | null) {
  const ctx = useContext(ExamAdvanceContext);
  useEffect(() => {
    ctx?.setHandler(fn);
    return () => ctx?.setHandler(null);
  }, [ctx, fn]);
}

/** Dùng trong MockExamShell: lấy hàm đã đăng ký (nếu có) để chạy trước khi submit. */
export function useExamAdvanceHandler(): () => BeforeAdvance | null {
  const ctx = useContext(ExamAdvanceContext);
  return () => ctx?.getHandler() ?? null;
}
