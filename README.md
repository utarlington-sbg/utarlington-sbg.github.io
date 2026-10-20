# AWS Student Builder Group at UT Arlington

The approved purple/blue design, built as a static Astro website. See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions, rendering behavior, and the boundaries to preserve during future development.

## Run locally

Use Node.js 22.22 or newer. With nvm:

```sh
nvm use
npm ci
npm run dev
```

Open the URL printed by Astro (normally `http://localhost:4321`). On WSL, keeping the checkout and its dependencies on the Linux filesystem avoids slow package startup through a Windows-mounted path.

```sh
npm run check         # Astro and TypeScript diagnostics
npm run test:content  # Content validation, event states, and Arlington time zones
npm run build         # Generates the deployable site in dist/
npx playwright install chromium
npm run test:browser  # Tests the production build at desktop and phone widths
npm run preview      # Serve the production build locally
```

Run `npm run build` before browser tests. `npm test` runs both test suites. CI checks types, builds the site, and runs the same tests. `PLAYWRIGHT_EXECUTABLE_PATH` can select an already-installed Chromium for local testing; normally leave it unset.

## Pages and design

- `/`: approved Home, four original sketches, particle field, and Home-only photo placeholder footer.
- `/events/`: upcoming events, an honest empty state, and the three existing Meetup archive entries.
- `/blog/`: square FIELD NOTES artwork and published/sample posts.
- `/blog/[id]/`: shareable article pages. Drafts generate no page; samples are labeled and excluded from indexing.
- `/events/[id]/`: generated when a scheduled event is added.
- `/grants/`: the current planning notice, without implying an open program.
- `/404.html`: a custom not-found page.

Navigation and page content work without JavaScript. JavaScript adds the scroll-direction header and a live particle background with eight original forms. It morphs with scrolling, responds gently to the pointer, and automatically respects reduced-motion preferences, with no visible motion controls. A lighter 2D renderer handles unavailable or lost WebGL; the approved SVG remains as the no-JavaScript fallback. Only Home uses the large image placeholder; the other pages use the compact footer. GitHub and Discord appear in both footer layouts.

The particle geometry and rendering decisions are recorded in [ARCHITECTURE.md](ARCHITECTURE.md). Run `node --experimental-strip-types scripts/capture-open-field.mjs` against a built preview to produce a local gallery and recording; install Playwright Chromium and FFmpeg first (`npx playwright install chromium ffmpeg`). Outputs go to the ignored `docs/verification/open-field/` folder.

## Update community links

Edit `src/data/site.ts`. Navigation, both footers, and join actions share this data. `src/data/grants.ts` contains the current Grants notice.

## Add a blog post

Create `src/content/blog/your-post.md`. The filename becomes the URL.

```md
---
title: What we built
summary: A short introduction to the project.
status: published
category: Build log
author: Your name
publishedAt: '2030-01-15'
---

Write the post here in Markdown.
```

The date above is only a format example; use the actual publication date. Categories are `Build log`, `Workshop notes`, `Guide`, and `Community`. Use `status: draft` while writing; drafts appear in neither the index nor generated routes. Published posts require an author and publication date. `status: sample` is reserved for clearly marked demonstration copy.

The existing **The first useful version** is the approved sample, not a real published group story. Replace it with approved editorial content before a public launch, or remove the file; an empty-state layout is provided.

## Add a scheduled event

Create `src/content/events/your-event.md`:

```md
---
title: A confirmed workshop
kind: scheduled
startsAt: '2030-01-15T18:00:00-06:00'
durationMinutes: 90
location: A confirmed room or online meeting location
rsvp: https://example.com/the-official-rsvp
---

What to bring, prerequisites, and the workshop description.
```

This is a format example, not a real event. Use the confirmed date, location, and RSVP URL. Include the date's correct UTC offset (`-06:00` for CST or `-05:00` for CDT). Visitors see dates in `America/Chicago`, with the correct CST/CDT label. Events remain upcoming through their duration, then enter the archive **when the site is rebuilt**. Rebuild whenever event information changes or a scheduled event ends.

The initial archive entries deliberately omit unverified dates. Their `kind: archive`, `order`, and `rsvp` fields preserve the approved title-only Meetup archive. Do not invent dates to fill the layout.

## Replace the Home photo placeholder

Add an approved group photo under `public/images/`, then set `homePhoto` in `src/data/site.ts`:

```ts
homePhoto: { src: '/images/community.jpg', alt: 'A description of the group gathering' },
```

Leaving `homePhoto: null` preserves the approved abstract placeholder. Other pages never display it. The current photo is decorative in the footer; essential context should also appear as page text.

## Build and host

This is a static site: deploy the contents of `dist/` to a static host such as AWS Amplify Hosting, Cloudflare Pages, or Netlify. The build command is `npm run build`; the output directory is `dist`. No API keys, database, or external service are needed to render the pages. Hosting has not been configured or published by this implementation.

Set `SITE_URL` to the final public HTTPS origin in the build environment to emit correct canonical and Open Graph URLs. `.env.example` documents the setting. No production domain is assumed. Set `BASE_PATH=/website/` for the GitHub Pages project URL, or leave it `/` for an origin-root host. Internal links, public assets, and compiled font URLs follow this base. CI verifies both layouts. Configure the host to serve `404.html` for unknown URLs.

## Sources and assets

The design research and screenshot collections in `docs/` are local working material and are intentionally ignored by Git. Durable design decisions live in [ARCHITECTURE.md](ARCHITECTURE.md); original illustration provenance and generation prompts live in [the sketch asset record](src/assets/sketches/README.md). Site assets are self-contained: the AWS kit is not required after checkout. The Space Grotesk license is included in `public/fonts/SpaceGrotesk-OFL.txt`; the supplied Amazon Ember Mono font is retained from the group asset kit. Original sketches are stored in `src/assets/sketches/` and optimized into responsive WebP files by Astro during builds.

The current logo uses the approved pixel treatment. The sample story, photo placeholder, and Grants planning notice can be replaced as the group supplies content.
