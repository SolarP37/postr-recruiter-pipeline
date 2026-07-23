import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  validateBackupSnapshot,
} from "@/lib/backup";

function fixture() {
  const data = {
    prospects: [{ id: "p1" }],
    outreachMessages: [],
    deliveryAttempts: [],
    sourceAssets: [],
    suppressionEntries: [{ id: "s1" }],
    auditEvents: [],
  };
  return {
    format: BACKUP_FORMAT,
    createdAt: "2026-07-21T00:00:00.000Z",
    counts: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value.length]),
    ),
    data,
  };
}

describe("database backup recovery validation", () => {
  it("accepts a complete internally consistent snapshot", () => {
    expect(validateBackupSnapshot(fixture())).toEqual([]);
  });

  it("detects missing tables and count corruption before recovery", () => {
    const broken = fixture();
    broken.counts.prospects = 99;
    delete (broken.data as Partial<typeof broken.data>).auditEvents;
    expect(validateBackupSnapshot(broken)).toEqual(
      expect.arrayContaining([
        "prospects count does not match its data.",
        "auditEvents is missing.",
      ]),
    );
  });
});
