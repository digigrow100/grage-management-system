"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function InvoiceRow({
  id,
  number,
  children,
}: {
  id: string;
  number: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const href = `/invoices/${id}`;
  return (
    <tr
      tabIndex={0}
      aria-label={`Open invoice ${number}`}
      onClick={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "a, button, input, select, textarea",
          )
        )
          return;
        router.push(href);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent-600"
    >
      {children}
    </tr>
  );
}
