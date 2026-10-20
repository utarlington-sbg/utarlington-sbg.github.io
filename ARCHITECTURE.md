# Website decisions and development context

This is the first implementation of the approved AWS Student Builder Group at UT Arlington design. The commit series separates foundations, content, artwork, layout, motion, individual pages, verification, and the navbar timing fix. Keep future commits focused on a behavior or decision so the history remains useful.

## Design intent

The visual direction combines Byotone's changing open field, Purdue Hackers' direct community copy and floating navigation, Inkling's abstract experiments, and Jackie Zhang's loose margin drawings. The implementation uses original geometry and artwork; reference-site scripts and illustrations are not vendored.

The palette uses deep purple (`#171225`) as the field, lavender (`#cfb9ff`) for emphasis, and blue (`#86b8ff`) for accents. Space Grotesk is the minimal primary face; Amazon Ember Mono is used for navigation and metadata. Preserve the short centered Home sections, generous spacing, and visible field rather than adding opaque hero panels or more promotional headings.

The approved Home hero has one “Come build with us” action. It has no cloud illustration, numbered section navigation, or motion toggle. Four decorative sketches belong in the lower Home sections. The notebook belongs only on Grants; the separate cloud belongs on Events. Original image prompts and provenance are in [the sketch asset record](src/assets/sketches/README.md).

The large abstract community-photo placeholder belongs only to Home. Events, Blogs, Grants, and article pages have a compact footer. Both footers include the provided GitHub and Discord destinations. The Blogs artwork remains a square FIELD NOTES composition.

## Static architecture and content boundaries

Astro generates static HTML with trailing slashes. `SiteLayout.astro` supplies metadata, navigation, and the appropriate footer. `src/data/site.ts` owns community links and the optional Home photo. There is no backend or application form. `SITE_URL` is optional until the production origin is selected; deployment assumes the origin root.

`src/content.config.ts` loads Markdown collections using the schemas in `src/lib/schemas.ts`. Blog entries distinguish draft, sample, and published states. Drafts have no public route; sample pages are labeled and use `noindex`; published posts require attribution and a date. The initial story is a sample, not a claim about a real group activity.

Events distinguish title-only archive records from scheduled events. Scheduled events require a timestamp with an offset, duration, location, and RSVP URL. Date labels use `America/Chicago`, including CST/CDT. An event remains upcoming until its end time. This is evaluated at build time, so rebuild after an event ends. Existing archive records intentionally have no invented dates. Grants remains a planning notice until the group defines a program; do not imply funding, eligibility, or applications are available.

## Motion and fallback behavior

`src/lib/open-field.ts` defines eight original parametric forms: knot, gather, braid, resonance, wave, weave, drift, and echo. Stable particle identities make interpolation possible. Two scroll positions per Home chapter expose all eight forms, including the final states before the Home footer. The chapter IDs remain useful anchor targets and geometry inputs; they do not represent visible chapter controls.

`src/scripts/field-renderer.ts` draws a single WebGL particle pass, using 16,800 points on desktop or 7,200 on an initially small viewport. Pixel density is capped and updates target 30 fps. A smaller Canvas 2D renderer handles unavailable WebGL and context loss. Keep the normal WebGL drawing-buffer lifecycle: pixel tests must inspect actual composited captures rather than enabling persistent buffers only for tests.

`src/scripts/open-field.ts` adds continuous breathing/rotation, damped pointer response, and 1.75-second transitions between forms. When a transition is interrupted, it starts from current particle positions. Motion is automatic, with no user-facing pause/resume UI. Operating-system reduced motion stops continuous movement and reacts to preference changes. Hidden documents and an offscreen Home field stop requesting frames. The original SVG remains the no-JavaScript fallback.

The live field sits above the page background and below Home content. It clips at the Home/footer boundary; the footer remains beneath the field until that boundary. This ordering matters: a negative field layer alone allows the footer to cover the final visible forms. Preserve the layering and clipping together.

## Navigation behavior

The fixed header is transparent except for its logo tile. It hides on downward scroll and returns on upward scroll. Keyboard navigation reveals it; hidden links must not become unreachable. Native links and all core page content work without JavaScript.

The exit transition must delay `visibility: hidden` for the 220 ms upward transform. Hiding visibility immediately prevents the exit from being painted, even when the transform transition exists. The return transition restores visibility immediately. The browser regression observes visibility at the start of hiding and after the animation; preserve both checks. Reduced-motion preferences disable transitions.

## Verification and maintenance

Run the commands in [README.md](README.md). Content tests cover schema validity, event end times and ordering, and local time-zone labels. Browser tests exercise the production build at 1440, 768, 390, and 320 pixels, plus real routes, sample indexing, square artwork, sketch bounds, scroll/keyboard navigation, native anchors, no-JavaScript navigation, and 404 behavior.

Motion tests inspect rendered pixels across all eight states, continuous motion, reduced motion and preference changes, Canvas 2D fallback, WebGL context loss, and final-state visibility at the footer. A renderer attribute alone does not prove the background is visible. The optional capture script writes galleries and recordings into ignored local research folders; it is not needed to serve the site.

Playwright invokes the installed Astro CLI directly with a single explicit `--host 127.0.0.1` matching its readiness URL. The npm preview script already supplies `--host`; appending another makes Astro discard the address and can leave CI polling the wrong loopback interface. The test command also uses `--ignore-lock` to keep Astro in the foreground, including in agent environments that otherwise auto-background previews. Playwright must own the test-server lifecycle; an existing local preview must not substitute for a clean CI build.

CI installs pinned npm dependencies, checks Astro/TypeScript, builds static pages, installs Chromium, and runs both test suites. Generated output, dependencies, environment secrets, reports, and local design research are ignored. Keep essential decisions in tracked documentation rather than linking to ignored screenshots or prototypes.

Public hosting is not configured by this implementation. Before launch, supply the final domain and approved editorial/photo content as available. Space Grotesk's license is included under `public/fonts/`; Amazon Ember Mono comes from the supplied group asset kit.
