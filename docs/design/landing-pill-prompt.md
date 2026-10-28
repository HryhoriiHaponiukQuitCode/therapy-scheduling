# Промпт: 3D-капсула в hero лендінгу

- **Навіщо:** за цим промптом зроблено інтерактивну капсулу праворуч у hero лендінгу (`src/components/landing-pill*.tsx`).
- **Звідки структура:** промпти бібліотеки MotionSites (2026-10-28) — «Wild pill hero» (пігулка-стадіон 2:1, поява,
  reduced motion, перевірка приймання) і «Facet "Designed in glass" hero» (three.js, `MeshPhysicalMaterial`,
  `RoomEnvironment`, нахил за курсором зі згладжуванням, пружина на наведенні, статична версія без WebGL). Їхній текст
  тут не скопійовано: взято розділи й прийоми, зміст, кольори й числа — наші (дизайн-система «Airy glass», `DESIGN.md`).
- **Мова:** сам промпт — англійською, як у джерелі.

---

# Prompt: Practice scheduling, glass capsule

Build an **interactive 3D capsule** for the right side of the guest landing hero of **Practice scheduling**, an
internal tool of one therapy practice. It replaces a static "day panel" and should feel calm, tactile and expensive:
a capsule floating in the air that you want to grab and spin. Use **three.js 0.186.1 only** (no React Three Fiber, no
drei, no images or models): one React client component in a Next.js 16 App Router page. Everything is built in code.

## Scene and scale

- **Container:** the whole right part of the one-screen hero, from under the header to the bottom: half the width,
  but never over the hero text (the left 800 px) or the "Sign in" button, so the capsule is a big hero object, not a
  card-sized one. Shown from 1100 px; below that the hero text stands alone and the three.js chunk is never
  downloaded.
- **Background:** none. The canvas is transparent and sits on the "Airy glass" page (blue-lavender gradient with soft
  blobs), so the capsule reads as part of the page, not a box.
- **Camera:** perspective, fov 30°, moved back so that a 4.6 × 4.8 unit frame (the capsule with hover, shadow and some air) fits
  both the width and the height of the canvas, whatever its proportions.
- **Renderer:** alpha, antialias, Neutral tone mapping (brand colours stay true), DPR capped at 2.
- **Environment:** PMREM `RoomEnvironment` for soft studio reflections, `environmentIntensity` 1 in light theme, .7 in
  dark; plus one soft key light from the top-left.

## The capsule

- **Shape:** a 2:1 stadium capsule (radius .8, total length ≈ 3.4), lying diagonally at about 33° from horizontal, top
  end to the left. Built from two `LatheGeometry` halves, each a **closed hollow shell** (outer wall, inner wall and a
  rim at the seam), so when the capsule opens you see a real 3D cut with wall thickness, not a paper-thin edge:
  - **Cap (lower-right half):** a touch wider (radius × 1.06, wall .04) and it overlaps the body by .12, like a real
    capsule cap; its inner wall is wider than the body, so the body slides in without intersecting it. Matte-satin
    plastic: `MeshPhysicalMaterial`, roughness .32, clearcoat 1, clearcoat roughness .18, sheen .4. A vertex-colour
    gradient along its length in the **logo gradient** (cyan → blue → violet).
  - **Body (upper-left half):** clear glass, wall .06. A see-through `MeshPhysicalMaterial` (transparent, opacity .3,
    no depth write), roughness .04, clearcoat 1, full specular, a faint lavender-white tint and a light iridescence
    (.3) for a thin sheen at grazing angles. Not `transmission`: on a transparent canvas it cannot see the page
    behind and renders the glass milky white.
- **Beads:** about 45 small spheres (radius .08 to .14, one `InstancedMesh`) inside the glass half, in the logo colours
  plus white, packed at random (seeded, so every visit looks the same), seen through the glass.
- **Contact shadow:** a soft radial blur plane under the capsule in the foreground colour, about 18 % opacity
  (10 % in dark theme). It tightens and fades as the capsule lifts.

## Colour

All colours come from CSS custom properties at runtime (`getComputedStyle(document.documentElement)`):
`--pill-a`, `--pill-b`, `--pill-c` (the logo gradient), `--pill-glass` (glass tint and white beads) and `--foreground`
(shadow). No colour literals in the component. When the theme class on `<html>` changes, the colours and environment
intensity update in place.

## Motion: idle

- **Entrance:** after the canvas is ready, the capsule grows from .85 and fades in over about 1 s (ease-out), about
  450 ms after the page starts, so it lands with the hero text.
- **Float:** y ± .08 on a 7 s sine, like the CSS `.float` of the page.
- **Spin:** a slow turn about its own long axis (.18 rad/s), so the beads and the glass sheen keep moving.

## Interaction

- **Cursor tilt (from anywhere on the page):** the capsule turns toward the pointer: rotateY = x · .35 rad,
  rotateX = −y · .25 rad (x, y normalised to −1…1 around the canvas centre and clamped). Smoothed with a 0.3 s
  exponential; eases back when the pointer leaves the window.
- **Hover (raycast on the capsule):** springs up to scale 1.06 (k 170, c 19); the glass gains sheen (iridescence
  .3 → .65, env intensity 1.4 → 2, opacity .3 → .38). Cursor `grab`.
- **Drag:** press on the capsule and drag to spin it freely (.01 rad per px, about the screen axes). On release it keeps
  spinning with inertia (velocity decays about 3× per second), then eases back to its resting pose. Cursor `grabbing`.
- **Click (press and release without dragging):** the capsule opens: the cap and body spring apart by .35 along the
  long axis, then close again after 0.8 s.
- **Off-screen or hidden tab:** the render loop stops.

## Reduced motion / no WebGL

- **`prefers-reduced-motion: reduce`:** no entrance, float, spin, cursor tilt or inertia. Drag still spins it (the user
  is moving it by hand) and it returns to rest at once on release.
- **No WebGL:** a static stadium in the same logo gradient, drawn in CSS, at the same place and size.
- The capsule is decorative: `aria-hidden`, not focusable; the hero text says everything without it.

## Acceptance check (1440×900 and 1920×1080, light and dark)

- A diagonal capsule on the right of the hero: half satin in the logo gradient, half clear glass with coloured beads
  seen through it; a soft shadow below.
- Moving the mouse tilts it; hovering grows it a little with a stronger sheen; dragging spins it with inertia and it
  settles back; a click opens and closes it.
- The column's space is reserved before the canvas loads: no layout shift.
- Below 1100 px nothing is rendered and three.js is not downloaded.
- Dark theme: the same capsule, softer environment and shadow.
- **Content:** no real brands or logos.
