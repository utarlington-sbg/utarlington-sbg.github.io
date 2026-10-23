const MAX_RIPPLES = 6;

const vertexSource = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

// The photo is redrawn as a three-tone ordered dither, then slow drifting
// noise and click ripples are dithered over it in the page's field color.
const fragmentSource = `
precision highp float;
uniform sampler2D uPhoto;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uFocus;
uniform float uCell;
uniform float uTime;
uniform vec3 uRipples[${MAX_RIPPLES}];

float bayer2(vec2 a) { a = floor(a); return fract(a.x * .5 + a.y * a.y * .75); }
float bayer4(vec2 a) { return bayer2(a * .5) * .25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(a * .5) * .25 + bayer2(a); }

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), u.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), u.x), u.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), u.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), u.x), u.y),
    u.z);
}
float clouds(vec2 p, float t) {
  float sum = 0.0, amp = .5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(vec3(p, t));
    p = p * 2.03 + vec2(17.0, 9.0);
    amp *= .5;
  }
  return sum;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  float threshold = bayer8(cell);

  float scale = max(uResolution.x / uImageSize.x, uResolution.y / uImageSize.y);
  vec2 drawn = uImageSize * scale;
  vec2 offset = (uResolution - drawn) * vec2(uFocus.x, 1.0 - uFocus.y);
  vec2 uv = ((cell + .5) * uCell - offset) / drawn;
  float light = dot(texture2D(uPhoto, uv).rgb, vec3(.299, .587, .114));
  light = clamp((light - .5) * 1.4 + .5, 0.0, 1.0);
  float level = clamp(floor(light * 1.65 + threshold), 0.0, 2.0);
  vec3 color = level < .5 ? vec3(.09, .07, .145) : level < 1.5 ? vec3(.42, .29, .96) : vec3(.81, .73, 1.0);

  // Coarse blocks keep the drifting shade chunky, like a low-resolution screen.
  vec2 block = floor(gl_FragCoord.xy / (uCell * 8.0)) * uCell * 8.0 / uResolution.y;
  float shade = smoothstep(.45, .75, clouds(block * 3.2, uTime * .06)) * .75;
  float top = 1.0 - gl_FragCoord.y / uResolution.y;
  shade = max(shade, 1.0 - smoothstep(0.0, .28, top));
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec3 ripple = uRipples[i];
    if (ripple.z < 0.0) continue;
    float age = uTime - ripple.z;
    float distance = length(block - floor(ripple.xy / (uCell * 8.0)) * uCell * 8.0 / uResolution.y);
    float ring = exp(-pow((distance - age * .35) / .07, 2.0));
    shade = max(shade, ring * 2.0 * exp(-age * .9) * exp(-distance * 1.2));
  }
  if (shade + threshold > 1.0) color = vec3(.09, .07, .145);
  gl_FragColor = vec4(color, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const result = gl.createShader(type);
  if (!result) throw new Error('Could not allocate footer shader');
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Could not compile footer shader');
  return result;
}

function initializeFooterDither() {
  const footer = document.querySelector<HTMLElement>('#home-footer');
  const art = footer?.querySelector<HTMLElement>('.footer-photo');
  const photo = art?.querySelector('img');
  const canvas = art?.querySelector('canvas');
  if (!footer || !art || !photo || !canvas) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const ripples = new Float32Array(MAX_RIPPLES * 3).fill(-1);
  let gl: WebGLRenderingContext | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let nextRipple = 0;
  let time = 0;
  let lastFrame = 0;
  let lastPaint = 0;
  let frameId = 0;
  let intersecting = false;
  let started = false;
  let lost = false;

  function paint() {
    if (!gl || lost) return;
    gl.uniform1f(uniforms.time, time);
    gl.uniform3fv(uniforms.ripples, ripples);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    if (!gl || !canvas) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.cell, Math.max(1, Math.round(2 * ratio)));
    paint();
  }

  function running() {
    return !!gl && !lost && intersecting && !motion.matches && !document.hidden;
  }

  function sync() {
    if (art) art.dataset.motion = motion.matches ? 'reduced' : 'running';
    if (running()) {
      if (!frameId) frameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrame = 0;
    }
  }

  function animate(now: number) {
    frameId = 0;
    if (!running()) return;
    time += lastFrame ? Math.min((now - lastFrame) / 1000, .25) : 1 / 60;
    lastFrame = now;
    if (now - lastPaint >= 1000 / 30 - 1) {
      paint();
      lastPaint = now;
    }
    frameId = requestAnimationFrame(animate);
  }

  function start() {
    if (!art || !photo || !canvas) return;
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Could not link footer program');
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photo);
    for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, wrap, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    uniforms = Object.fromEntries(['resolution', 'imageSize', 'focus', 'cell', 'time', 'ripples'].map(name =>
      [name, gl!.getUniformLocation(program, `u${name[0].toUpperCase()}${name.slice(1)}`)]));
    gl.uniform2f(uniforms.imageSize, photo.naturalWidth, photo.naturalHeight);
    const [focusX, focusY] = getComputedStyle(photo).objectPosition.split(' ').map(value => parseFloat(value) / 100);
    gl.uniform2f(uniforms.focus, focusX || .5, focusY || .5);

    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      lost = true;
      delete art.dataset.renderer;
      sync();
    }, { once: true });
    art.dataset.renderer = 'webgl';
    resize();
    sync();
    new ResizeObserver(resize).observe(canvas);
  }

  function begin() {
    if (started || !photo) return;
    started = true;
    photo.decode().then(() => {
      try { start(); } catch { if (art) delete art.dataset.renderer; }
    }, () => { /* The plain photo stays visible. */ });
  }

  footer.addEventListener('pointerdown', event => {
    if (!running() || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / Math.max(1, rect.width);
    ripples.set([(event.clientX - rect.left) * ratio, (rect.bottom - event.clientY) * ratio, time], nextRipple * 3);
    nextRipple = (nextRipple + 1) % MAX_RIPPLES;
  }, { passive: true });
  motion.addEventListener('change', () => { paint(); sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    intersecting = entry?.isIntersecting ?? false;
    if (intersecting) begin();
    sync();
  }, { rootMargin: '200px 0px' }).observe(footer);
}

initializeFooterDither();
