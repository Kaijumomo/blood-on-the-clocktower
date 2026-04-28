import { describe, expect, it } from "vitest";
import { ringRadius, seatPosition, tokenSizeForCount } from "./layout";

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe("seatPosition", () => {
  it("seat 0 is at top of circle (0, -r)", () => {
    const p = seatPosition(0, 4, 100);
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, -100)).toBe(true);
  });

  it("seat 1 of 4 is at right (r, 0)", () => {
    const p = seatPosition(1, 4, 100);
    expect(close(p.x, 100)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });

  it("seat 2 of 4 is at bottom (0, r)", () => {
    const p = seatPosition(2, 4, 100);
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, 100)).toBe(true);
  });

  it("seat 3 of 4 is at left (-r, 0)", () => {
    const p = seatPosition(3, 4, 100);
    expect(close(p.x, -100)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });

  it("seats are evenly spaced on the ring (sum to zero)", () => {
    const N = 12;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i++) {
      const p = seatPosition(i, N, 200);
      sx += p.x;
      sy += p.y;
    }
    expect(close(sx, 0, 1e-6)).toBe(true);
    expect(close(sy, 0, 1e-6)).toBe(true);
  });

  it("each seat sits exactly on the ring (distance = radius)", () => {
    const N = 9;
    const R = 137;
    for (let i = 0; i < N; i++) {
      const p = seatPosition(i, N, R);
      const d = Math.sqrt(p.x * p.x + p.y * p.y);
      expect(Math.abs(d - R)).toBeLessThan(1e-9);
    }
  });

  it("zero or negative seat counts return origin", () => {
    expect(seatPosition(0, 0, 100)).toEqual({ x: 0, y: 0 });
  });
});

describe("ringRadius", () => {
  it("scales with container size", () => {
    const r600 = ringRadius(600, 90);
    const r900 = ringRadius(900, 90);
    expect(r900).toBeGreaterThan(r600);
  });

  it("never returns less than minimum", () => {
    expect(ringRadius(40, 90)).toBeGreaterThanOrEqual(60);
  });
});

describe("tokenSizeForCount", () => {
  it("shrinks tokens as player count grows", () => {
    expect(tokenSizeForCount(5)).toBeGreaterThan(tokenSizeForCount(15));
  });
});
