import type { FieldGeometry } from '../lib/open-field';

export interface FieldFrame {
  time: number;
  blend: number;
  pointerX: number;
  pointerY: number;
  opacity: number;
  heightFraction: number;
}

export interface FieldRenderer {
  mode: 'webgl' | 'canvas2d';
  resize(width: number, height: number): void;
  morph(from: Float32Array, to: Float32Array): void;
  draw(frame: FieldFrame): void;
  destroy(): void;
}

const vertexSource = `
precision highp float;
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aIdentity;
uniform float uTime;
uniform float uBlend;
uniform vec2 uPointer;
uniform vec2 uViewport;
uniform float uPixelRatio;
uniform float uOpacity;
uniform float uHeightFraction;
varying vec4 vColor;
void main() {
  float blend = smoothstep(0.0, 1.0, clamp(uBlend * 1.18 - aIdentity.w * .18, 0.0, 1.0));
  vec3 p = mix(aFrom, aTo, blend);
  float phase = aIdentity.x * 6.2831853;
  float breath = 1.0 + .035 * sin(uTime * .65 + phase * 2.0);
  p *= breath;
  p.y += .06 * sin(p.x * 4.0 + uTime * .7 + aIdentity.y * 2.0);
  p.z += .055 * cos(p.y * 5.0 + uTime * .55 + phase);
  float yaw = .3 * sin(uTime * .12) + uPointer.x * .16;
  float pitch = .2 + .12 * sin(uTime * .09) - uPointer.y * .1;
  p.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * p.xz;
  p.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * p.yz;
  float perspective = 3.2 / (3.2 - p.z);
  float aspect = uViewport.x / uViewport.y;
  float scale = min(1.0, aspect * .97);
  vec2 screen = p.xy * perspective * scale * vec2(1.0 / aspect, 1.0);
  screen *= uHeightFraction;
  screen.y += 1.0 - uHeightFraction;
  gl_Position = vec4(screen, 0.0, 1.0);
  gl_PointSize = (1.0 + aIdentity.z * 1.65) * perspective * uPixelRatio;
  vec3 purple = vec3(.79, .66, 1.0);
  vec3 blue = vec3(.48, .72, 1.0);
  vec3 color = mix(purple, blue, step(.7, aIdentity.w));
  float depth = clamp(.62 + p.z * .4, .24, 1.0);
  vColor = vec4(color, (.28 + aIdentity.z * .48) * depth * uOpacity);
}`;

const fragmentSource = `
precision mediump float;
varying vec4 vColor;
void main() {
  float distance = length(gl_PointCoord - .5) * 2.0;
  float alpha = 1.0 - smoothstep(.15, 1.0, distance);
  gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
}`;

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const result = gl.createShader(type);
  if (!result) throw new Error('Could not allocate field shader');
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    gl.deleteShader(result);
    throw new Error('Could not compile field shader');
  }
  return result;
}

export function webglRenderer(canvas: HTMLCanvasElement, geometry: FieldGeometry): FieldRenderer | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Could not allocate field program');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Could not link field program');
  gl.useProgram(program);
  const buffer = (name: string, size: number, data: Float32Array) => {
    const result = gl.createBuffer();
    if (!result) throw new Error('Could not allocate field buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, result);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    return result;
  };
  const fromBuffer = buffer('aFrom', 3, geometry.forms[0]);
  const toBuffer = buffer('aTo', 3, geometry.forms[0]);
  const identityBuffer = buffer('aIdentity', 4, geometry.identities);
  const uniforms = {
    time: gl.getUniformLocation(program, 'uTime'),
    blend: gl.getUniformLocation(program, 'uBlend'),
    pointer: gl.getUniformLocation(program, 'uPointer'),
    viewport: gl.getUniformLocation(program, 'uViewport'),
    pixelRatio: gl.getUniformLocation(program, 'uPixelRatio'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
    heightFraction: gl.getUniformLocation(program, 'uHeightFraction'),
  };
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  return {
    mode: 'webgl',
    resize(width, height) {
      const ratio = Math.min(devicePixelRatio || 1, width < 700 ? 1.25 : 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.viewport, width, height);
      gl.uniform1f(uniforms.pixelRatio, ratio);
    },
    morph(from, to) {
      gl.bindBuffer(gl.ARRAY_BUFFER, fromBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, from);
      gl.bindBuffer(gl.ARRAY_BUFFER, toBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, to);
    },
    draw(frame) {
      gl.uniform1f(uniforms.time, frame.time);
      gl.uniform1f(uniforms.blend, frame.blend);
      gl.uniform2f(uniforms.pointer, frame.pointerX, frame.pointerY);
      gl.uniform1f(uniforms.opacity, frame.opacity);
      gl.uniform1f(uniforms.heightFraction, frame.heightFraction);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, geometry.count);
    },
    destroy() {
      for (const entry of [fromBuffer, toBuffer, identityBuffer]) gl.deleteBuffer(entry);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
    },
  };
}

export function canvasRenderer(canvas: HTMLCanvasElement, geometry: FieldGeometry): FieldRenderer | null {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  let from: Float32Array = geometry.forms[0];
  let to: Float32Array = geometry.forms[0];
  let width = 1;
  let height = 1;
  const stride = Math.max(1, Math.floor(geometry.count / 2400));
  return {
    mode: 'canvas2d',
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
    },
    morph(nextFrom, nextTo) { from = nextFrom; to = nextTo; },
    draw(frame) {
      context.clearRect(0, 0, width, height);
      const yaw = .3 * Math.sin(frame.time * .12) + frame.pointerX * .16;
      const pitch = .2 + .12 * Math.sin(frame.time * .09) - frame.pointerY * .1;
      const scale = height * .5 * Math.min(1, width / height * .97) * frame.heightFraction;
      const sinYaw = Math.sin(yaw), cosYaw = Math.cos(yaw);
      const sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
      for (let i = 0; i < geometry.count; i += stride) {
        const offset = i * 3, identity = i * 4;
        const stagger = Math.max(0, Math.min(1, frame.blend * 1.18 - geometry.identities[identity + 3] * .18));
        const blend = stagger * stagger * (3 - 2 * stagger);
        const phase = geometry.identities[identity] * Math.PI * 2;
        const breath = 1 + .035 * Math.sin(frame.time * .65 + phase * 2);
        let x = (from[offset] + (to[offset] - from[offset]) * blend) * breath;
        let y = (from[offset + 1] + (to[offset + 1] - from[offset + 1]) * blend) * breath;
        let z = (from[offset + 2] + (to[offset + 2] - from[offset + 2]) * blend) * breath;
        y += .06 * Math.sin(x * 4 + frame.time * .7 + geometry.identities[identity + 1] * 2);
        z += .055 * Math.cos(y * 5 + frame.time * .55 + phase);
        const nextX = x * cosYaw + z * sinYaw;
        z = -x * sinYaw + z * cosYaw;
        x = nextX;
        const nextY = y * cosPitch + z * sinPitch;
        z = -y * sinPitch + z * cosPitch;
        y = nextY;
        const perspective = 3.2 / (3.2 - z);
        context.globalAlpha = (.25 + geometry.identities[identity + 2] * .45) * Math.max(.24, Math.min(1, .62 + z * .4)) * frame.opacity;
        context.fillStyle = geometry.identities[identity + 3] > .7 ? '#86b8ff' : '#cfb9ff';
        const size = (.7 + geometry.identities[identity + 2]) * perspective;
        context.fillRect(width / 2 + x * scale * perspective, height * frame.heightFraction / 2 - y * scale * perspective, size, size);
      }
      context.globalAlpha = 1;
    },
    destroy() { context.clearRect(0, 0, width, height); },
  };
}
