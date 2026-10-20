import { z } from 'astro/zod';

const httpUrl = z.url({ protocol: /^https?$/ });
const eventBase = z.object({ title: z.string().trim().min(1), rsvp: httpUrl });

export const eventSchema = z.discriminatedUnion('kind', [
  eventBase.extend({ kind: z.literal('archive'), order: z.number().int().nonnegative() }),
  eventBase.extend({
    kind: z.literal('scheduled'),
    startsAt: z.iso.datetime({ offset: true }),
    durationMinutes: z.number().int().positive().max(1440),
    location: z.string().trim().min(1),
  }),
]);

const blogBase = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  category: z.enum(['Build log', 'Workshop notes', 'Guide', 'Community']),
});

export const blogSchema = z.discriminatedUnion('status', [
  blogBase.extend({ status: z.literal('draft') }),
  blogBase.extend({ status: z.literal('sample') }),
  blogBase.extend({
    status: z.literal('published'),
    author: z.string().trim().min(1),
    publishedAt: z.iso.date(),
  }),
]);

export type EventData = z.infer<typeof eventSchema>;
export type BlogData = z.infer<typeof blogSchema>;
