import { describe, expect, it } from "vitest";
import { REDACTED_OPERATIONAL_ERROR } from "@/lib/operations";

describe("operational error reporting", () => {
  it("uses a fixed message that cannot expose exception contents", () => {
    const sensitiveException = new Error(
      "prospect@example.com failed with Bearer secret-token and postgresql://user:password@example.com/postr",
    );

    expect(REDACTED_OPERATIONAL_ERROR).not.toContain(sensitiveException.message);
    expect(REDACTED_OPERATIONAL_ERROR).not.toMatch(/prospect@example\.com|secret-token|password/);
    expect(REDACTED_OPERATIONAL_ERROR).toMatch(/redacted/i);
  });
});
