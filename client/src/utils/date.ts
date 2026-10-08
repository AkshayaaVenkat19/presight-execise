const birthDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats an ISO `YYYY-MM-DD` birth date as `02/Oct/2021`; UTC keeps the calendar day stable. */
export function formatBirthDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return birthDateFormatter
    .formatToParts(parsed)
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join("/");
}
