export type Point = { x: number; y: number };

export function seatPosition(seat: number, total: number, radius: number): Point {
  if (total <= 0) return { x: 0, y: 0 };
  const angle = -Math.PI / 2 + (2 * Math.PI * seat) / total;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

export function ringRadius(containerSize: number, tokenSize: number): number {
  const margin = 24;
  return Math.max(60, containerSize / 2 - tokenSize / 2 - margin);
}

export function tokenSizeForCount(total: number): number {
  if (total <= 5) return 110;
  if (total <= 8) return 100;
  if (total <= 11) return 90;
  if (total <= 14) return 80;
  return 72;
}
