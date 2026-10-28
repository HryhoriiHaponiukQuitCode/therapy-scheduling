"use client";

import { useEffect, useRef, useState } from "react";
import {
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { beadLayout, damp, pointerOffset, springStep } from "@/lib/pill-motion";

// Капсула: радіус, пряма частина кожної половини (разом 2·(LENGTH + RADIUS) ≈ 3.4, стадіон 2:1), ковпачок ширший
// і заходить на корпус, як у справжньої капсули. Обидві половини — порожнисті оболонки зі стінкою й торцем: коли
// капсула відкривається, видно справжній зріз. Внутрішня стінка ковпачка (RADIUS·CAP_SCALE − CAP_WALL) ширша за
// корпус, тож корпус входить у ковпачок, не перетинаючи його.
const RADIUS = 0.8;
const LENGTH = 0.9;
const CAP_SCALE = 1.06;
const CAP_WALL = 0.04;
const BODY_WALL = 0.06;
const CAP_OVERLAP = 0.12;
const REST_TILT = 0.995; // ≈ 33° до горизонталі, корпус (скло) — вгорі ліворуч
const BEADS = 45;
const DRAG_RAD_PER_PX = 0.01;
const OPEN_DISTANCE = 0.35;
// Капсула трохи вище центру полотна (тінь — разом із нею).
const RAISE = 0.35;
// Що має вміститися в кадр за будь-яких пропорцій полотна: капсула по діагоналі з наведенням і тінню.
const FIT_WIDTH = 4.6;
const FIT_HEIGHT = 4.8;

/**
 * Замкнений профіль половини капсули для LatheGeometry: внутрішня стінка від вершини вниз до шва (y = from), торець
 * (кільце товщиною wall), зовнішня стінка вгору до вершини. Напрям обходу задає, куди дивляться грані: внутрішні —
 * усередину, торець — до шва, зовнішні — назовні. Короткі відрізки біля кутів торця тримають його ребра чіткими.
 */
function shellProfile(radius: number, wall: number, from: number): Vector2[] {
  const inner = radius - wall;
  const arc = (r: number, i: number) => {
    const t = (i / 20) * (Math.PI / 2);
    return new Vector2(r * Math.cos(t), LENGTH + r * Math.sin(t));
  };
  const points: Vector2[] = [];
  for (let i = 20; i >= 0; i--) points.push(arc(inner, i));
  points.push(new Vector2(inner, from + 0.01), new Vector2(inner, from));
  points.push(new Vector2(radius, from), new Vector2(radius, from + 0.01));
  for (let i = 0; i <= 20; i++) points.push(arc(radius, i));
  return points;
}

/** Кольори з токенів (DESIGN.md, розділ 2): у компоненті немає жодного літерала кольору. */
function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => new Color().setStyle(style.getPropertyValue(name).trim());
  return {
    a: token("--pill-a"),
    b: token("--pill-b"),
    c: token("--pill-c"),
    glass: token("--pill-glass"),
    shadow: token("--foreground"),
    dark: document.documentElement.classList.contains("dark"),
  };
}

// 3D-капсула праворуч у hero лендінгу за промптом docs/design/landing-pill-prompt.md: ковпачок у градієнті лого,
// скляний корпус із гранулами; нахиляється до курсора, росте на наведенні, крутиться перетягуванням з інерцією,
// відкривається кліком. Без WebGL — статичний стадіон (.pill-fallback). Декоративна: обгортка aria-hidden.
export function LandingPillScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // three.js потребує WebGL2; компонент рендериться лише в браузері (ssr: false), тож перевірка — одразу.
  const [webgl, setWebgl] = useState(() => Boolean(document.createElement("canvas").getContext("webgl2")));

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!webgl || !wrap || !canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      // Контекст є, але рендерер не створився (ліміт контекстів, драйвер): показати .pill-fallback. Стан — у
      // наступному кадрі, не синхронно в ефекті (react-hooks/set-state-in-effect).
      const frame = requestAnimationFrame(() => setWebgl(false));
      return () => cancelAnimationFrame(frame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = NeutralToneMapping;

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 50);

    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envMap;
    const key = new DirectionalLight(undefined, 1.3);
    key.position.set(-3, 4, 5);
    scene.add(key);

    // Ковпачок: градієнт лого вершинними кольорами від шва (c → b) до дальнього кінця (a).
    const capGeometry = new LatheGeometry(shellProfile(RADIUS * CAP_SCALE, CAP_WALL, -CAP_OVERLAP), 72);
    const capMaterial = new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      sheen: 0.4,
    });
    const cap = new Mesh(capGeometry, capMaterial);
    cap.rotation.x = Math.PI;

    // Скло — напівпрозоре, а не transmission: на прозорому полотні transmission не бачить сторінки й робить корпус
    // матово-білим. Зовнішня й внутрішня стінки разом дають товщину скла, торець видно на зрізі.
    const bodyGeometry = new LatheGeometry(shellProfile(RADIUS, BODY_WALL, 0), 72);
    const bodyMaterial = new MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      iridescence: 0.3,
      iridescenceIOR: 1.3,
    });
    const body = new Mesh(bodyGeometry, bodyMaterial);

    const beads = beadLayout(BEADS, { radius: RADIUS, length: LENGTH, wall: 0.1, seed: 7 });
    const beadGeometry = new SphereGeometry(1, 20, 14);
    const beadMaterial = new MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const beadMesh = new InstancedMesh(beadGeometry, beadMaterial, beads.length);
    const matrix = new Matrix4();
    const noRotation = new Quaternion();
    beads.forEach(({ x, y, z, r }, i) => {
      matrix.compose(new Vector3(x, y, z), noRotation, new Vector3(r, r, r));
      beadMesh.setMatrixAt(i, matrix);
    });

    const bodyGroup = new Group();
    bodyGroup.add(body, beadMesh);
    const spin = new Group();
    spin.add(cap, bodyGroup);
    const pill = new Group();
    pill.rotation.z = REST_TILT;
    pill.add(spin);
    const drag = new Group();
    drag.add(pill);
    const root = new Group();
    root.add(drag);
    scene.add(root);

    // Тінь — розмита еліпса під капсулою, обличчям до камери; маска — сірий радіальний градієнт (alphaMap бере G).
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = maskCanvas.height = 128;
    const mask = maskCanvas.getContext("2d");
    if (mask) {
      const gradient = mask.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "white");
      gradient.addColorStop(1, "black");
      mask.fillStyle = gradient;
      mask.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new CanvasTexture(maskCanvas);
    const shadowGeometry = new PlaneGeometry(1, 1);
    const shadowMaterial = new MeshBasicMaterial({ alphaMap: shadowTexture, transparent: true, depthWrite: false });
    const shadow = new Mesh(shadowGeometry, shadowMaterial);
    shadow.position.set(0, RAISE - 1.95, -1);
    scene.add(shadow);

    let shadowOpacity = 0.18;
    const applyTheme = () => {
      const palette = readPalette();
      const position = capGeometry.getAttribute("position");
      const colors: number[] = [];
      const span = LENGTH + RADIUS * CAP_SCALE + CAP_OVERLAP;
      const tint = new Color();
      for (let i = 0; i < position.count; i++) {
        const t = (position.getY(i) + CAP_OVERLAP) / span;
        if (t < 0.5) tint.lerpColors(palette.c, palette.b, t * 2);
        else tint.lerpColors(palette.b, palette.a, (t - 0.5) * 2);
        colors.push(tint.r, tint.g, tint.b);
      }
      capGeometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
      bodyMaterial.color.copy(palette.glass);
      const tones = [palette.a, palette.b, palette.c, palette.glass];
      beads.forEach(({ tone }, i) => beadMesh.setColorAt(i, tones[tone]));
      if (beadMesh.instanceColor) beadMesh.instanceColor.needsUpdate = true;
      shadowMaterial.color.copy(palette.shadow);
      shadowOpacity = palette.dark ? 0.1 : 0.18;
      scene.environmentIntensity = palette.dark ? 0.7 : 1;
    };
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    const onMotionChange = () => {
      reduced = motionQuery.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = wrap;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Висота колонки залежить від екрана: відстань камери — така, щоб вмістилось і за шириною, і за висотою.
      const halfTan = Math.tan((camera.fov * Math.PI) / 360);
      const distance = Math.max(FIT_HEIGHT, FIT_WIDTH / camera.aspect) / (2 * halfTan);
      camera.position.set(0, 0, distance);
      // Дальня межа — за капсулою й тінню на будь-якій відстані (у високому вузькому полотні камера відходить далеко).
      camera.far = distance + 10;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    resize();

    // Стан руху. Нахил — до вказівника відносно центру полотна в межах вікна; наведення — raycast по капсулі.
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const targetTilt = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    let hovered = false;
    let dragging = false;
    let pointerId = -1;
    let last = { x: 0, y: 0, time: 0 };
    let moved = 0;
    const velocity = { x: 0, y: 0 };
    let scale = 1;
    let scaleVelocity = 0;
    let open = 0;
    let openVelocity = 0;
    let openTarget = 0;
    let closeAt = 0;
    let appear = reduced ? 1 : 0;
    let spinAngle = 0;
    let elapsed = 0;
    const axisX = new Vector3(1, 0, 0);
    const axisY = new Vector3(0, 1, 0);
    const step = new Quaternion();
    const identity = new Quaternion();

    const hitTest = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects([cap, body], false).length > 0;
    };
    const setCursor = () => {
      canvas.style.cursor = dragging ? "grabbing" : hovered ? "grab" : "";
    };
    const rotateBy = (dx: number, dy: number) => {
      drag.quaternion.premultiply(step.setFromAxisAngle(axisY, dx)).premultiply(step.setFromAxisAngle(axisX, dy));
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const [x, y] = pointerOffset(event.clientX, event.clientY, {
        left: cx - window.innerWidth / 2,
        top: cy - window.innerHeight / 2,
        width: window.innerWidth,
        height: window.innerHeight,
      });
      targetTilt.x = y * 0.25;
      targetTilt.y = x * 0.35;
      if (dragging && event.pointerId === pointerId) {
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        const dt = Math.max((event.timeStamp - last.time) / 1000, 1 / 120);
        rotateBy(dx * DRAG_RAD_PER_PX, dy * DRAG_RAD_PER_PX);
        velocity.x = damp(velocity.x, (dx * DRAG_RAD_PER_PX) / dt, 20, dt);
        velocity.y = damp(velocity.y, (dy * DRAG_RAD_PER_PX) / dt, 20, dt);
        moved += Math.abs(dx) + Math.abs(dy);
        last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      } else {
        hovered = hitTest(event.clientX, event.clientY);
      }
      setCursor();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!hitTest(event.clientX, event.clientY)) return;
      dragging = true;
      hovered = true;
      pointerId = event.pointerId;
      moved = 0;
      velocity.x = velocity.y = 0;
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      canvas.setPointerCapture(event.pointerId);
      setCursor();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      // Відпустив майже без руху — це клік: капсула відкривається й за 0.8 с закривається.
      if (moved < 5) {
        openTarget = 1;
        closeAt = elapsed + 0.8;
      }
      // Інерція лише якщо рух вказівника не зупинився перед відпусканням.
      if (event.timeStamp - last.time > 80) velocity.x = velocity.y = 0;
      if (reduced) {
        velocity.x = velocity.y = 0;
        drag.quaternion.identity();
      }
      hovered = hitTest(event.clientX, event.clientY);
      setCursor();
    };
    const onLeave = () => {
      targetTilt.x = targetTilt.y = 0;
      hovered = false;
      setCursor();
    };
    window.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    let frame = 0;
    let previous = 0;
    const render = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
      previous = now;
      elapsed += dt;

      appear = reduced ? 1 : damp(appear, 1, 3.5, dt);
      tilt.x = reduced ? 0 : damp(tilt.x, targetTilt.x, 3.3, dt);
      tilt.y = reduced ? 0 : damp(tilt.y, targetTilt.y, 3.3, dt);
      root.rotation.set(tilt.x, tilt.y, 0);
      const float = reduced ? 0 : Math.sin((elapsed / 7) * Math.PI * 2) * 0.08;
      root.position.y = RAISE + float;

      if (!reduced) spinAngle += 0.18 * dt;
      spin.rotation.y = spinAngle;

      if (!dragging) {
        rotateBy(velocity.x * dt, velocity.y * dt);
        velocity.x *= Math.exp(-3 * dt);
        velocity.y *= Math.exp(-3 * dt);
        const speed = Math.hypot(velocity.x, velocity.y);
        drag.quaternion.slerp(identity, 1 - Math.exp(-dt * 3 * Math.max(0, 1 - speed / 2)));
      }

      [scale, scaleVelocity] = springStep(scale, scaleVelocity, hovered || dragging ? 1.06 : 1, 170, 19, dt);
      pill.scale.setScalar(scale * (0.85 + 0.15 * appear));
      const shine = (scale - 1) / 0.06;
      bodyMaterial.iridescence = 0.3 + 0.35 * shine;
      bodyMaterial.envMapIntensity = 1.4 + 0.6 * shine;
      bodyMaterial.opacity = 0.3 + 0.08 * shine;

      if (openTarget === 1 && elapsed >= closeAt) openTarget = 0;
      [open, openVelocity] = springStep(open, openVelocity, openTarget, 120, 14, dt);
      cap.position.y = (-open * OPEN_DISTANCE) / 2;
      bodyGroup.position.y = (open * OPEN_DISTANCE) / 2;

      const lift = (float + 0.08) / 0.16;
      shadow.scale.set(2.7 * (1 - 0.08 * lift) * scale, 0.42, 1);
      shadowMaterial.opacity = shadowOpacity * (1 - 0.3 * lift) * appear;
      canvas.style.opacity = String(appear);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };

    // Цикл лише поки полотно на екрані й вкладка видима.
    let visible = false;
    const sync = () => {
      const run = visible && !document.hidden;
      if (run && !frame) {
        previous = 0;
        frame = requestAnimationFrame(render);
      } else if (!run && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    viewObserver.observe(wrap);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(frame);
      viewObserver.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      for (const disposable of [
        capGeometry,
        capMaterial,
        bodyGeometry,
        bodyMaterial,
        beadGeometry,
        beadMaterial,
        beadMesh,
        shadowGeometry,
        shadowMaterial,
        shadowTexture,
        envMap,
        room,
        pmrem,
        renderer,
      ]) {
        disposable.dispose();
      }
    };
  }, [webgl]);

  return (
    <div ref={wrapRef} className="relative size-full">
      {!webgl ? (
        <div className="grid size-full place-items-center">
          <div className="pill-fallback" />
        </div>
      ) : (
        <canvas ref={canvasRef} className="block size-full touch-pan-y opacity-0" />
      )}
    </div>
  );
}
