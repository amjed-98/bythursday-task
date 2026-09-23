import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const APP_TIME_ZONE = "Asia/Amman";
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function ammanInputToUtc(value: string): Date {
  if (!DATETIME_LOCAL_PATTERN.test(value)) throw new Error(`Invalid date/time "${value}", expected YYYY-MM-DDTHH:mm`);
  const date = fromZonedTime(value, APP_TIME_ZONE);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date/time "${value}"`);
  return date;
}

export function utcToAmmanInput(date: Date): string {
  return formatInTimeZone(date, APP_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

export function formatAmman(date: Date): string {
  return formatInTimeZone(date, APP_TIME_ZONE, "d MMM yyyy, HH:mm");
}
