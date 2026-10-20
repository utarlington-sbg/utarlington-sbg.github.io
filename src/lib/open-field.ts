export const fieldForms = ['knot', 'gather', 'braid', 'resonance', 'wave', 'weave', 'drift', 'echo'] as const;
export type FieldForm = typeof fieldForms[number];

const tau = Math.PI * 2;
type Point = readonly [number, number, number];

/** Original parametric forms, sharing a stable particle identity for morphs. */
function point(form: FieldForm, u: number, v: number, w: number): Point {
  const angle = u * tau;
  const around = v * tau;
  const spread = (w - .5) * .06;
  switch (form) {
    case 'knot': {
      const ring = .58 + .2 * Math.cos(3 * angle);
      const tube = .12 * Math.cos(around);
      return [(ring + tube) * Math.cos(2 * angle), (ring + tube) * Math.sin(2 * angle), .25 * Math.sin(3 * angle) + .12 * Math.sin(around)];
    }
    case 'gather': {
      const x = (u * 2 - 1) * 1.5;
      const radius = .06 + .62 * (1 - u) ** 1.8;
      return [x, radius * Math.cos(around) + .18 * Math.sin(u * Math.PI), radius * Math.sin(around) + spread];
    }
    case 'braid': {
      const phase = u * tau * 2.2 + (v < .5 ? 0 : Math.PI);
      const radius = .32 + .08 * Math.sin(u * Math.PI);
      return [(u * 2 - 1) * 1.35, radius * Math.cos(phase) + .08 * Math.cos(around * 6), radius * Math.sin(phase) + .08 * Math.sin(around * 6) + spread];
    }
    case 'resonance': {
      const radius = Math.sqrt(v) * (.66 + .2 * Math.cos(angle * 5));
      const height = .23 * Math.sin(radius * 11) * Math.cos(angle * 3);
      return [radius * Math.cos(angle), radius * Math.sin(angle), height + spread];
    }
    case 'wave': {
      const x = (u * 2 - 1) * 1.45;
      const amplitude = .16 + .34 * Math.sin(u * Math.PI) ** 2;
      return [x, Math.sin(u * tau * 1.6 + around * .32) * amplitude + (v - .5) * .19, .22 * Math.cos(u * tau * 2 + around) + spread];
    }
    case 'weave': {
      const radius = .55 + .17 * Math.sin(angle * 3 + around);
      return [radius * Math.cos(angle) * 1.3, radius * Math.sin(angle) * .8 + .18 * Math.sin(around * 2), .34 * Math.sin(around + angle * 2)];
    }
    case 'drift': {
      const x = (u * 2 - 1) * 1.55;
      const strand = Math.floor(v * 7) / 6 - .5;
      return [x, x * .32 + strand * .68 + .12 * Math.sin(u * tau + strand * 5), .26 * Math.cos(u * tau * .8 + strand * 3) + spread];
    }
    case 'echo': {
      const ring = .16 + Math.floor(v * 7) * .105 + (w - .5) * .025;
      return [ring * Math.cos(angle) * 1.3, ring * Math.sin(angle) * .7, .13 * Math.sin(ring * 16 + angle * 2)];
    }
  }
}

export function createFieldGeometry(count: number) {
  let seed = 4817;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const forms = fieldForms.map(() => new Float32Array(count * 3));
  const identities = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const u = (i + random() * .7) / count;
    const v = random();
    const w = random();
    identities.set([u, v, w, random()], i * 4);
    fieldForms.forEach((form, index) => forms[index].set(point(form, u, v, w), i * 3));
  }
  return { forms, identities, count };
}

export type FieldGeometry = ReturnType<typeof createFieldGeometry>;

export function fieldScrollStops(chapters: readonly { top: number; height: number }[], offset: number, maxScroll = Infinity): number[] {
  const stops = chapters.flatMap((chapter, index) => [
    Math.max(0, chapter.top - (index ? offset : 0)),
    Math.max(0, chapter.top + chapter.height * (index ? .48 : .55) - offset),
  ]);
  const end = stops.at(-1) || 1;
  const scale = Math.min(1, Math.max(0, maxScroll) / end);
  return stops.map(stop => stop * scale);
}
