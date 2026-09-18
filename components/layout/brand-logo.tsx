"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useMounted } from "@/lib/use-mounted";

export function BrandLogo() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const src =
    mounted && resolvedTheme === "dark"
      ? "/brand/pte-life-logo-dark.png"
      : "/brand/pte-life-logo-light.png";

  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <Image
        src={src}
        alt="PTE-Life"
        width={2040}
        height={694}
        className="h-7 w-auto"
        priority
      />
    </Link>
  );
}
