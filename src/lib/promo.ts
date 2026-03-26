import type { PromoConfig } from "../types/promo";

function getComponents(date: Date, timezone: string): {
  year: number; month: number; day: number;
  hour: number; minute: number; dayOfWeek: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
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

function dateAtHour(ref: Date, hour: number, timezone: string, dayOffset = 0): Date {
  const { year, month, day } = getComponents(ref, timezone);
  const guess = new Date(Date.UTC(year, month - 1, day + dayOffset, hour + 7));
  const check = getComponents(guess, timezone);
  if (check.hour !== hour) {
    guess.setTime(guess.getTime() + (hour - check.hour) * 3600000);
  }
  return guess;
}

export function isPromoActive(now: Date, config: PromoConfig): boolean {
  if (!config.active) return false;
  const { year, month, day } = getComponents(now, config.timezone);
  const dateNum = year * 10000 + month * 100 + day;
  const [sy, sm, sd] = config.start.split("-").map(Number);
  const [ey, em, ed] = config.end.split("-").map(Number);
  const startNum = sy * 10000 + sm * 100 + sd;
  const endNum = ey * 10000 + em * 100 + ed;
  return dateNum >= startNum && dateNum < endNum;
}

export function isPeak(now: Date, config: PromoConfig): boolean {
  const { hour, dayOfWeek } = getComponents(now, config.timezone);
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (config.weekendsOffPeak && !isWeekday) return false;
  return isWeekday && hour >= config.peakStartHour && hour < config.peakEndHour;
}

export function getNextTransition(now: Date, config: PromoConfig): Date {
  const { hour, dayOfWeek } = getComponents(now, config.timezone);

  if (isPeak(now, config)) {
    return dateAtHour(now, config.peakEndHour, config.timezone);
  }

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (isWeekday && hour < config.peakStartHour) {
    return dateAtHour(now, config.peakStartHour, config.timezone);
  }

  let daysUntilNextWeekday: number;
  if (dayOfWeek === 5) daysUntilNextWeekday = 3;
  else if (dayOfWeek === 6) daysUntilNextWeekday = 2;
  else if (dayOfWeek === 0) daysUntilNextWeekday = 1;
  else daysUntilNextWeekday = 1;

  return dateAtHour(now, config.peakStartHour, config.timezone, daysUntilNextWeekday);
}

export function getLocalPeakHours(
  userTimezone: string,
  refDate: Date,
  config: PromoConfig,
): { startHour: number; endHour: number } {
  const peakStartUTC = dateAtHour(refDate, config.peakStartHour, config.timezone);
  const peakEndUTC = dateAtHour(refDate, config.peakEndHour, config.timezone);

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
