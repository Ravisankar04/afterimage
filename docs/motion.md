# Motion system

AFTERIMAGE’s motion language is archival and cinematic: things solidify, fragment, and disappear. Motion should **communicate meaning**, not decorate every component.

## Intent

Inspired by experimental editorial sites (principles only — never copy assets or layouts), the experience should feel like entering an archive from the future.

Core brand beat (homepage):

```text
REAL → OBSERVED → DOCUMENTED → DISAPPEARING → GONE.
Then: BUT NOT FORGOTTEN. → AFTERIMAGE
```

Scroll choreography (Lenis + GSAP ScrollTrigger + Framer Motion + Three.js) carries that narrative. Wallet chrome stays secondary.

## Central tokens

Do not scatter magic numbers. Define a shared motion module (conceptually):

```text
motion.duration
motion.easing
motion.stagger
motion.spring
motion.pageTransition
```

Use these for page transitions, Field hover reveals, create-flow stage changes, and Three.js camera moves.

## Meaningful motion map

| Moment | Motion meaning |
|--------|----------------|
| Hero object dissolve | Physical disappearance |
| Field point hover | Archival attention |
| Contested layout split | Competing claims |
| Time Machine scrub | Chronological traversal |
| Hash / mono readout | Forensic stillness (minimal motion) |

Avoid animating purely decorative chrome.

## `prefers-reduced-motion`

When reduced motion is enabled, disable or drastically simplify:

- excessive camera movement
- particle effects
- large transforms
- rapid transitions
- parallax / horizontal hijacks that impair comprehension

Typography and structure should remain readable without the cinematic path. Offer an equivalent static hero statement.

## Performance

- Prefer GPU-friendly transforms/opacity
- Pause offscreen Three.js renders
- Avoid continuous high-cost effects on mobile
- Lazy-load heavy WebGL scenes after first paint when possible

## Accessibility

- Keyboard access to Field items and primary CTAs
- Visible focus states (editorial, not default browser-only neglect)
- Do not convey unique information by motion alone
- Respect reduced motion before initializing Lenis smooth-scroll hijacking

## Anti-patterns

- Purple neon “Web3” glow loops
- Infinite particle fields with no narrative job
- Autoplaying motion that blocks interaction
- Ignoring reduced-motion preferences

Motion in AFTERIMAGE is how disappearance becomes visible — then how memory remains.
