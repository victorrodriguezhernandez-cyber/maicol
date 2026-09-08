import { describe, expect, it } from "vitest";
import { kgToLb, lbToKg, mlToFlOz, flOzToMl, roundForDisplay } from "./units";

describe("unit conversions", () => {
  it("round-trips kg <-> lb", () => {
    const kg = 82.5;
    expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 9);
  });

  it("converts a known kg/lb pair", () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4);
  });

  it("round-trips ml <-> fl oz", () => {
    const ml = 330;
    expect(flOzToMl(mlToFlOz(ml))).toBeCloseTo(ml, 9);
  });

  it("rounds only for display", () => {
    expect(roundForDisplay(2145.4)).toBe(2145);
    expect(roundForDisplay(2145.5)).toBe(2146);
    expect(roundForDisplay(72.449, 1)).toBe(72.4);
    expect(roundForDisplay(72.451, 1)).toBe(72.5);
  });
});
