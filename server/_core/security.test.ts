import { describe, expect, it } from "vitest";
import { parseDurationToMs } from "./security";

describe("parseDurationToMs", () => {
  it("parses values with units", () => {
    expect(parseDurationToMs("15m", 1000)).toBe(900000);
    expect(parseDurationToMs("2h", 1000)).toBe(7200000);
    expect(parseDurationToMs("30s", 1000)).toBe(30000);
  });

  it("returns fallback for invalid values", () => {
    expect(parseDurationToMs("invalid", 1234)).toBe(1234);
    expect(parseDurationToMs(undefined, 5678)).toBe(5678);
  });
});
