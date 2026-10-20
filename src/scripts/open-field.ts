import { createFieldGeometry, fieldForms, fieldScrollStops } from '../lib/open-field';
import { canvasRenderer, webglRenderer, type FieldRenderer } from './field-renderer';

function initializeField() {
  const root = document.querySelector<HTMLElement>('[data-open-field]');
  const home = document.querySelector<HTMLElement>('.home-page');
  let canvas = root?.querySelector('canvas');
  if (!root || !home || !canvas) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(pointer: fine)');
  const chapters = [...home.querySelectorAll<HTMLElement>('.chapter')];
  const geometry = createFieldGeometry(innerWidth < 700 ? 7200 : 16800);
  let renderer: FieldRenderer | null = null;
  let from = geometry.forms[0].slice();
  let to = geometry.forms[0];
  let form = 0;
  let blend = 1;
  let time = 0;
  let lastFrame = 0;
  let lastPaint = 0;
  let frameId = 0;
  let intersecting = true;
  let suspended = false;
  let reducedMotion = motion.matches;
  let stops: number[] = [];
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  let opacity = .73;
  let targetOpacity = opacity;
  let heightFraction = 1;

  function paint() {
    renderer?.draw({ time, blend, pointerX, pointerY, opacity, heightFraction });
  }

  function running() {
    return !reducedMotion && intersecting && !document.hidden && !suspended && !!renderer;
  }

  function sync() {
    if (!root) return;
    root.dataset.motion = reducedMotion ? 'reduced' : 'running';
    if (running()) {
      if (!frameId) frameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrame = 0;
      lastPaint = 0;
    }
  }

  function animate(now: number) {
    frameId = 0;
    if (!running()) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .25) : 1 / 60;
    lastFrame = now;
    time += delta;
    blend = Math.min(1, blend + delta / 1.75);
    const ease = 1 - Math.exp(-delta * 5);
    pointerX += (targetX - pointerX) * ease;
    pointerY += (targetY - pointerY) * ease;
    opacity += (targetOpacity - opacity) * ease;
    if (now - lastPaint >= 1000 / 30 - 1) {
      paint();
      lastPaint = now;
    }
    frameId = requestAnimationFrame(animate);
  }

  function setForm(next: number) {
    if (next === form) return;
    // Capture an interrupted morph per particle, so quick scrolling never jumps.
    const nextFrom = new Float32Array(from.length);
    for (let i = 0; i < geometry.count; i++) {
      const progress = Math.max(0, Math.min(1, blend * 1.18 - geometry.identities[i * 4 + 3] * .18));
      const eased = progress * progress * (3 - 2 * progress);
      for (let axis = 0; axis < 3; axis++) {
        const offset = i * 3 + axis;
        nextFrom[offset] = from[offset] + (to[offset] - from[offset]) * eased;
      }
    }
    from = nextFrom;
    to = geometry.forms[next];
    form = next;
    blend = reducedMotion ? 1 : 0;
    renderer?.morph(from, to);
    if (root) root.dataset.fieldState = fieldForms[form];
    if (reducedMotion) {
      opacity = targetOpacity;
      paint();
    }
  }

  function scroll() {
    if (home) {
      const bottom = home.getBoundingClientRect().bottom;
      heightFraction = Math.max(0, Math.min(1, bottom / innerHeight));
      root?.style.setProperty('--field-bottom', `${Math.max(0, innerHeight - bottom)}px`);
    }
    let next = 0;
    for (let i = 0; i < stops.length; i++) if (scrollY >= stops[i] - 2) next = i;
    targetOpacity = .73 - Math.min(1, scrollY / Math.max(1, stops[2] || innerHeight)) * .4;
    setForm(Math.min(fieldForms.length - 1, next));
    if (reducedMotion) paint();
  }

  function resize() {
    if (!home) return;
    const header = document.querySelector<HTMLElement>('[data-header]');
    const offset = header ? header.offsetTop + header.offsetHeight + 16 : 88;
    stops = fieldScrollStops(chapters.map(chapter => ({ top: chapter.getBoundingClientRect().top + scrollY, height: chapter.offsetHeight })), offset, document.documentElement.scrollHeight - innerHeight);
    renderer?.resize(innerWidth, innerHeight);
    scroll();
    paint();
  }

  function useCanvasFallback() {
    if (!root || !canvas) return;
    renderer?.destroy();
    const nextCanvas = canvas.cloneNode(false);
    if (!(nextCanvas instanceof HTMLCanvasElement)) return;
    canvas.replaceWith(nextCanvas);
    canvas = nextCanvas;
    renderer = canvasRenderer(canvas, geometry);
    if (renderer) {
      renderer.morph(from, to);
      root.dataset.renderer = renderer.mode;
      resize();
      sync();
    } else {
      delete root.dataset.renderer;
      sync();
    }
  }

  try { renderer = webglRenderer(canvas, geometry); } catch { /* Try the lighter renderer below. */ }
  if (!renderer) useCanvasFallback();
  else {
    root.dataset.renderer = renderer.mode;
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      useCanvasFallback();
    }, { once: true });
  }
  root.dataset.fieldState = fieldForms[form];
  resize();
  sync();

  motion.addEventListener('change', () => {
    reducedMotion = motion.matches;
    if (reducedMotion) { blend = 1; paint(); }
    sync();
  });
  window.addEventListener('pointermove', event => {
    if (!pointer.matches || reducedMotion) return;
    targetX = event.clientX / innerWidth * 2 - 1;
    targetY = event.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
  window.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { suspended = true; sync(); });
  window.addEventListener('pageshow', () => { suspended = false; sync(); });
  new IntersectionObserver(([entry]) => { intersecting = entry?.isIntersecting ?? false; sync(); }).observe(home);
  new ResizeObserver(resize).observe(home);
  document.fonts.ready.then(resize);
}

initializeField();
