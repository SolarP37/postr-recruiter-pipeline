import { describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  suggestedSendAt,
} from "@/lib/outreach-schedule";

describe("outreach send-window suggestions", () => {
  it("validates IANA time zones without guessing", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("not/a-zone")).toBe(false);
  });

  it("suggests 10:00 local on a weekday after the minimum delay", () => {
    const result = suggestedSendAt({
      earliestAt: new Date("2026-07-06T12:00:00.000Z"),
      timeZone: "America/New_York",
      preferredHourLocal: 10,
    });
    expect(result.usedTimeZone).toBe(true);
    expect(result.scheduledFor.toISOString()).toBe(
      "2026-07-06T14:00:00.000Z",
    );
  });

  it("moves a weekend suggestion to Monday", () => {
    const result = suggestedSendAt({
      earliestAt: new Date("2026-07-04T01:00:00.000Z"),
      timeZone: "Asia/Taipei",
      preferredHourLocal: 10,
    });
    expect(result.scheduledFor.toISOString()).toBe(
      "2026-07-06T02:00:00.000Z",
    );
  });

  it("uses the minimum time unchanged when no supported zone is recorded", () => {
    const earliestAt = new Date("2026-07-06T12:00:00.000Z");
    expect(
      suggestedSendAt({
        earliestAt,
        timeZone: null,
      }),
    ).toEqual({ scheduledFor: earliestAt, usedTimeZone: false });
  });
});
