export const CALENDAR_DAYS = 5;

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Use the workshop's day, rather than the server or browser's timezone. */
export function workshopToday(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Date-only arithmetic stays consistent across daylight-saving changes. */
export function shiftCalendarDate(value: string, offset: number): string {
  if (!isCalendarDate(value)) throw new Error("Invalid calendar date");
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function bookingCalendarDays(start: string, count = CALENDAR_DAYS) {
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return Array.from({ length: count }, (_, index) => {
    const date = shiftCalendarDate(start, index);
    return { date, label: label.format(new Date(`${date}T00:00:00Z`)) };
  });
}
