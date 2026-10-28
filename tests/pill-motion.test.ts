import { describe, expect, it } from "vitest";
import { beadLayout, damp, pointerOffset, springStep } from "@/lib/pill-motion";

describe("pill-motion: рух 3D-капсули лендінгу", () => {
  it("damp не залежить від частоти кадрів: два кроки по dt дорівнюють одному кроку 2·dt", () => {
    const twice = damp(damp(0, 1, 3, 0.016), 1, 3, 0.016);
    expect(twice).toBeCloseTo(damp(0, 1, 3, 0.032), 10);
    expect(damp(0, 1, 3, 10)).toBeCloseTo(1, 6);
  });

  it("пружина наведення (k 170, c 19) за секунду доходить до цілі й зупиняється", () => {
    let [value, velocity] = [1, 0];
    for (let i = 0; i < 60; i++) [value, velocity] = springStep(value, velocity, 1.06, 170, 19, 1 / 60);
    expect(value).toBeCloseTo(1.06, 3);
    expect(Math.abs(velocity)).toBeLessThan(0.01);
  });

  it("вказівник поза полотном обмежено −1…1, центр дає 0", () => {
    const rect = { left: 100, top: 50, width: 400, height: 400 };
    expect(pointerOffset(300, 250, rect)).toEqual([0, 0]);
    expect(pointerOffset(-500, 2000, rect)).toEqual([-1, 1]);
  });

  it("гранули щоразу ті самі й лежать усередині скляної половини", () => {
    const options = { radius: 0.8, length: 0.9, wall: 0.1, seed: 7 };
    const beads = beadLayout(70, options);
    expect(beads).toHaveLength(70);
    expect(beadLayout(70, options)).toEqual(beads);
    const inner = options.radius - options.wall;
    for (const { x, y, z, r } of beads) {
      expect(y - r).toBeGreaterThanOrEqual(0);
      const dy = Math.max(0, y - options.length);
      expect(Math.hypot(x, z, dy) + r).toBeLessThanOrEqual(inner + 1e-9);
    }
  });
});
