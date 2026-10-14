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

/**
 * Stops a click from reaching an ancestor ClickableRow/ClickableCard. Needed
 * whenever that ancestor's page is a Server Component — a plain element
 * there can't carry its own onClick (functions aren't serializable across
 * the server/client boundary), so the interactive child is wrapped in this
 * small Client Component instead.
 */
export function StopPropagation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </span>
  );
}
