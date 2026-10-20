import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogSchema, eventSchema } from './lib/schemas';

export const collections = {
  blog: defineCollection({ loader: glob({ base: './src/content/blog', pattern: '**/*.md' }), schema: blogSchema }),
  events: defineCollection({ loader: glob({ base: './src/content/events', pattern: '**/*.md' }), schema: eventSchema }),
};
