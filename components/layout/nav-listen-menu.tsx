"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SKILL_ACCENT_COLOR } from "@/lib/question-types";

export const LISTEN_PRACTICE_LINKS = [
  {
    id: "write-from-dictation",
    name: "Write From Dictation",
    href: "/practice/listening/write-from-dictation/luyen-nghe",
    code: "WFD",
    color: SKILL_ACCENT_COLOR.listening,
  },
  {
    id: "repeat-sentence",
    name: "Repeat Sentence",
    href: "/practice/speaking/repeat-sentence/luyen-nghe",
    code: "RS",
    color: SKILL_ACCENT_COLOR.speaking,
  },
];

export function ListenWaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="2" y="11" width="4" height="9" rx="2" fill="currentColor" />
      <rect x="18" y="11" width="4" height="9" rx="2" fill="currentColor" />
      <rect x="7" y="13" width="1.6" height="6" rx="0.8" fill="currentColor" />
      <rect x="9.8" y="10" width="1.6" height="12" rx="0.8" fill="currentColor" />
      <rect x="12.6" y="12" width="1.6" height="8" rx="0.8" fill="currentColor" />
      <rect x="15.2" y="14" width="1.6" height="4" rx="0.8" fill="currentColor" />
    </svg>
  );
}

export function NavListenMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        openOnHover
        delay={60}
        closeDelay={150}
        render={
          <Button
            variant="ghost"
            className="group h-16 gap-1 px-3 text-[14px] leading-5 font-normal text-gray-500 dark:text-gray-400 hover:bg-transparent hover:text-gray-900 aria-expanded:bg-transparent aria-expanded:text-gray-900 dark:hover:bg-transparent dark:hover:text-white dark:aria-expanded:bg-transparent dark:aria-expanded:text-white"
            nativeButton={false}
            render={<Link href="/luyen-de-pte" />}
          />
        }
      >
        <ListenWaveIcon className="size-5" />
        <span className="relative inline-flex h-full items-center">
          Luyện nghe
          <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#d6474c] transition-all duration-300 group-hover:w-full group-aria-expanded:w-full" />
        </span>
        <svg className="size-2" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
          <path d="M0 0L5 6L10 0H0Z" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px] p-1.5">
        {LISTEN_PRACTICE_LINKS.map((item) => (
          <DropdownMenuItem
            key={item.id}
            render={<Link href={item.href} />}
            className="flex items-center justify-between gap-2 px-2.5 py-2 text-sm"
          >
            <span>{item.name}</span>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-extrabold text-white"
              style={{ background: item.color }}
            >
              {item.code}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
