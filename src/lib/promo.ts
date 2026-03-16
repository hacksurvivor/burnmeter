import { PROMO_TZ, PEAK_START_HOUR, PEAK_END_HOUR } from "./constants";

function getPTComponents(date: Date): {
  year: number; month: number; day: number;
  hour: number; minute: number; dayOfWeek: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PROMO_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map(p => [p.type, p.value])
  );
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month),
    day: parseInt(parts.day),
    hour: parseInt(parts.hour === "24" ? "0" : parts.hour),
    minute: parseInt(parts.minute),
    dayOfWeek: dayMap[parts.weekday] ?? 0,
  };
}

/**
 * Returns a UTC Date representing the moment when the given PT hour (on the
 * calendar day that is `dayOffset` days after the PT calendar day of `ref`)
 * occurs. Works correctly across PST/PDT transitions.
 */
function ptDateAtHour(ref: Date, hour: number, dayOffset = 0): Date {
  const { year, month, day } = getPTComponents(ref);

  // Build a rough UTC estimate: assume PT = UTC-7 (PDT) as a starting point
  const guess = new Date(Date.UTC(year, month - 1, day + dayOffset, hour + 7));

  // Check what hour that actually lands on in PT and correct
  const check = getPTComponents(guess);
  if (check.hour !== hour) {
    guess.setTime(guess.getTime() + (hour - check.hour) * 3600000);
  }
  return guess;
}

export function isPromoActive(now: Date): boolean {
  const { year, month, day } = getPTComponents(now);
  const dateNum = year * 10000 + month * 100 + day;
  const startNum = 20260313;
  const endNum = 20260328;
  return dateNum >= startNum && dateNum < endNum;
}

export function isPeak(now: Date): boolean {
  const { hour, dayOfWeek } = getPTComponents(now);
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  return isWeekday && hour >= PEAK_START_HOUR && hour < PEAK_END_HOUR;
}

export function getNextTransition(now: Date): Date {
  const { hour, dayOfWeek } = getPTComponents(now);

  if (isPeak(now)) {
    return ptDateAtHour(now, PEAK_END_HOUR);
  }

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (isWeekday && hour < PEAK_START_HOUR) {
    return ptDateAtHour(now, PEAK_START_HOUR);
  }

  let daysUntilNextWeekday: number;
  if (dayOfWeek === 5) daysUntilNextWeekday = 3;       // Friday -> Monday
  else if (dayOfWeek === 6) daysUntilNextWeekday = 2;  // Saturday -> Monday
  else if (dayOfWeek === 0) daysUntilNextWeekday = 1;  // Sunday -> Monday
  else daysUntilNextWeekday = 1;                        // Weekday after peak -> next day

  return ptDateAtHour(now, PEAK_START_HOUR, daysUntilNextWeekday);
}

export function getLocalPeakHours(
  userTimezone: string,
  refDate: Date
): { startHour: number; endHour: number } {
  const peakStartUTC = ptDateAtHour(refDate, PEAK_START_HOUR);
  const peakEndUTC = ptDateAtHour(refDate, PEAK_END_HOUR);

  const getHourInTZ = (date: Date, tz: string) => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "2-digit", hour12: false,
    });
    const h = fmt.formatToParts(date).find(p => p.type === "hour")!.value;
    return parseInt(h === "24" ? "0" : h);
  };

  return {
    startHour: getHourInTZ(peakStartUTC, userTimezone),
    endHour: getHourInTZ(peakEndUTC, userTimezone),
  };
}
