// Рух 3D-капсули лендінгу (docs/design/landing-pill-prompt.md) без three.js: чисті функції, щоб їх перевірити тестами.

/** Експоненційне згладжування до цілі: за час 1/lambda проходить ≈63 % відстані, не залежить від частоти кадрів. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** Крок пружини (жорсткість k, загасання c) напівнеявним Ейлером: повертає нові значення й швидкість. */
export function springStep(
  value: number,
  velocity: number,
  target: number,
  k: number,
  c: number,
  dt: number,
): [number, number] {
  const v = velocity + (k * (target - value) - c * velocity) * dt;
  return [value + v * dt, v];
}

/** Положення вказівника відносно центру прямокутника, у межах −1…1 по кожній осі (y донизу). */
export function pointerOffset(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
): [number, number] {
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  return [
    clamp(((x - rect.left) / rect.width) * 2 - 1),
    clamp(((y - rect.top) / rect.height) * 2 - 1),
  ];
}

/** Детермінований генератор у [0, 1) (mulberry32): щоб гранули щоразу лежали однаково. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Bead = { x: number; y: number; z: number; r: number; tone: number };

/**
 * Гранули всередині скляної половини капсули: вісь — y від 0 (шов) до length + radius (вершина півкулі).
 * Кожна гранула цілком усередині стінки (inner = radius − стінка) і не виходить за шов.
 */
export function beadLayout(
  count: number,
  { radius, length, wall, seed }: { radius: number; length: number; wall: number; seed: number },
): Bead[] {
  const random = seededRandom(seed);
  const inner = radius - wall;
  const beads: Bead[] = [];
  while (beads.length < count) {
    const r = 0.08 + random() * 0.06;
    const y = r + random() * (length + inner - 2 * r);
    // Центр гранули — у «меншій» капсулі радіуса inner − r: циліндр до length, далі півкуля.
    const dy = Math.max(0, y - length);
    const room = Math.sqrt(Math.max(0, (inner - r) ** 2 - dy * dy));
    if (room <= 0) continue;
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * room;
    beads.push({ x: Math.cos(angle) * dist, y, z: Math.sin(angle) * dist, r, tone: Math.floor(random() * 4) });
  }
  return beads;
}
