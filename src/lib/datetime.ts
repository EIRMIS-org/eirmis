const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

function createDateTimeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
}

function getParts(formatter: Intl.DateTimeFormat, date: Date) {
  const parts = formatter.formatToParts(date)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

function getOffset(timestamp: number, formatter: Intl.DateTimeFormat) {
  const parts = getParts(formatter, new Date(timestamp))
  const formattedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return formattedAsUtc - Math.floor(timestamp / 1000) * 1000
}

export function toZonedIsoString(localValue: string, timeZone: string): string {
  if (!localValue) return ""

  const match = LOCAL_DATE_TIME_PATTERN.exec(localValue)
  if (!match) return ""

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const check = new Date(guess)

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return ""
  }

  try {
    const formatter = createDateTimeFormatter(timeZone)
    const firstOffset = getOffset(guess, formatter)
    const firstResult = guess - firstOffset
    const correctedOffset = getOffset(firstResult, formatter)
    return new Date(guess - correctedOffset).toISOString()
  } catch {
    return ""
  }
}

export function toZonedLocalString(
  isoValue: string,
  timeZone: string,
): string {
  if (!isoValue) return ""

  const timestamp = Date.parse(isoValue)
  if (Number.isNaN(timestamp)) return ""

  try {
    const parts = getParts(createDateTimeFormatter(timeZone), new Date(timestamp))
    const pad = (value: number) => String(value).padStart(2, "0")

    return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(
      parts.day,
    )}T${pad(parts.hour)}:${pad(parts.minute)}`
  } catch {
    return ""
  }
}
