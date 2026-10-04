"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function BookingCalendar({
  selectedDate,
  children,
}: {
  selectedDate: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calendar = ref.current;
    const selected = calendar?.querySelector<HTMLElement>(
      `[data-calendar-date="${selectedDate}"]`,
    );
    if (!calendar || !selected) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      calendar.scrollLeft = selected.offsetLeft - calendar.offsetLeft;
    } else {
      const main = calendar.closest("main");
      if (main) {
        main.scrollTop += selected.getBoundingClientRect().top -
          calendar.getBoundingClientRect().top;
      }
    }
  }, [selectedDate]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Booking calendar"
      tabIndex={0}
      className="booking-calendar-scroll relative max-w-full rounded-2xl md:overflow-x-auto focus-visible:outline-2 focus-visible:outline-accent-500"
    >
      {children}
    </div>
  );
}
