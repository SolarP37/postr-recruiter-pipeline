export const MAX_OUTREACH_ATTEMPTS = 3;
export const DEFAULT_SEND_HOUR_LOCAL = 10;

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const number = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: number("year"),
    month: number("month"),
    day: number("day"),
    hour: number("hour"),
    minute: number("minute"),
    second: number("second"),
  };
}

function timeZoneOffset(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedDateToUtc(
  parts: Pick<ZonedParts, "year" | "month" | "day" | "hour">,
  timeZone: string,
) {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
  );
  let result = new Date(guess - timeZoneOffset(new Date(guess), timeZone));
  const correctedOffset = timeZoneOffset(result, timeZone);
  result = new Date(guess - correctedOffset);
  return result;
}

function addLocalDays(
  parts: Pick<ZonedParts, "year" | "month" | "day">,
  days: number,
) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isWeekend(parts: Pick<ZonedParts, "year" | "month" | "day">) {
  const day = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
  return day === 0 || day === 6;
}

export function suggestedSendAt(input: {
  earliestAt: Date;
  timeZone: string | null;
  preferredHourLocal?: number | null;
}) {
  const hour = Math.min(
    16,
    Math.max(
      8,
      input.preferredHourLocal ?? DEFAULT_SEND_HOUR_LOCAL,
    ),
  );
  if (!input.timeZone || !isValidTimeZone(input.timeZone)) {
    return {
      scheduledFor: input.earliestAt,
      usedTimeZone: false,
    };
  }

  let localDate = zonedParts(input.earliestAt, input.timeZone);
  let candidate = zonedDateToUtc(
    { ...localDate, hour },
    input.timeZone,
  );
  if (candidate < input.earliestAt) {
    localDate = { ...localDate, ...addLocalDays(localDate, 1) };
  }
  while (isWeekend(localDate)) {
    localDate = { ...localDate, ...addLocalDays(localDate, 1) };
  }
  candidate = zonedDateToUtc(
    { ...localDate, hour },
    input.timeZone,
  );
  return {
    scheduledFor: candidate,
    usedTimeZone: true,
  };
}

export function formatScheduledTime(
  date: Date,
  timeZone: string | null,
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone:
      timeZone && isValidTimeZone(timeZone) ? timeZone : undefined,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
