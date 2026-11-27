import { describe, expect, it } from "vitest"
import { toZonedIsoString, toZonedLocalString } from "./datetime"

describe("timezone-aware datetime conversions", () => {
  it("converts Asia/Manila 18:00 wall-clock to 10:00 UTC timestamp", () => {
    expect(
      toZonedIsoString("2026-12-01T18:00", "Asia/Manila"),
    ).toBe("2026-12-01T10:00:00.000Z")
  })

  it("formats 10:00 UTC timestamp to 18:00 in Asia/Manila", () => {
    expect(
      toZonedLocalString("2026-12-01T10:00:00.000Z", "Asia/Manila"),
    ).toBe("2026-12-01T18:00")
  })

  it("round trips a wall-clock value in the requested timezone", () => {
    const localValue = "2026-12-01T18:00"
    expect(
      toZonedLocalString(
        toZonedIsoString(localValue, "Asia/Manila"),
        "Asia/Manila",
      ),
    ).toBe(localValue)
  })

  it("handles a UTC date rollover for Asia/Manila", () => {
    expect(
      toZonedIsoString("2026-12-01T02:00", "Asia/Manila"),
    ).toBe("2026-11-30T18:00:00.000Z")
  })

  it("uses the applicable standard and daylight offsets in New York", () => {
    expect(
      toZonedIsoString("2026-01-15T12:00", "America/New_York"),
    ).toBe("2026-01-15T17:00:00.000Z")
    expect(
      toZonedIsoString("2026-07-15T12:00", "America/New_York"),
    ).toBe("2026-07-15T16:00:00.000Z")
  })

  it("handles an offset-zero timezone", () => {
    expect(toZonedIsoString("2026-12-01T18:00", "UTC")).toBe(
      "2026-12-01T18:00:00.000Z",
    )
  })
})
