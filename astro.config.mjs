import { defineConfig } from 'astro/config';

const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base,
  redirects: base === '/' ? { '/website/': '/' } : {},
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
