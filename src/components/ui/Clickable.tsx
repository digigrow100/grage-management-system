"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A <tr> that navigates to `href` when clicked anywhere in the row. Nested
 * links/buttons should call stopPropagation in their own onClick so they
 * don't also trigger (or race) the row-level navigation.
 */
export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <tr onClick={() => router.push(href)} className={cn("cursor-pointer", className)}>
      {children}
    </tr>
  );
}

/** Same idea as ClickableRow, for card/div-based lists rather than tables. */
export function ClickableCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <div onClick={() => router.push(href)} className={cn("cursor-pointer", className)}>
      {children}
    </div>
  );
}
