# TIANCONG — Immersive Industrial Website

Single-page website for **Handan Tiancong Fastener Manufacturing Co., Ltd.** (Yongnian · Handan · China, est. 1989). Content adapted from the company's corporate site.

## Approach

No stiff code-only decoration. Two real layers do the heavy lifting:

1. **Real spark footage** — `assets/sparks.mp4`: actual welding-arc footage (Mixkit, free for commercial use, no attribution required) as the fullscreen hero background, graded dark with cinematic vignette overlays.
2. **Physics-driven WebGL sparks** — a `THREE.Points` system where every spark is ballistic: launched in an upward cone, pulled down by gravity, dragged by air, and cooled white-hot → orange → dark over its lifespan (additive blending fades it out naturally). Soft-glow sprite texture baked on canvas acts as cheap bloom. A slow ambient ember field drifts through every section.

Technique references studied on GitHub:
- **bruno-simon/folio-2019** (~9k★, the most-starred immersive 3D website) — explorable-world architecture, physics systems, presence-reactive zones. Applied: scroll-driven camera journey + pointer-parallax "you are inside it" feel instead of a static hero prop.
- **Robinzon100/3D_hero** — award-style 3D hero structure: canvas + GLSL-style grading + GSAP camera moves + Lenis smooth scroll.

## Motion
- Lenis buttery smooth scroll + GSAP ScrollTrigger choreography
- Pinned horizontal-scroll manufacturing process (6 stations, none outsourced)
- Animated counters, sailing-time bars, marquee, magnetic-feel custom cursor, film grain

## Copy
Plain factory voice, no AI marketing fluff. Numbers from the company's own materials: 30,000 t/yr, M3–M64, 35+ countries, ISO 9001:2015.

## Stack
Pure static, no build step. Three.js 0.160 + GSAP 3.12 + Lenis via CDN.

## Deploy (free)
- **Vercel**: import repo → Deploy (free `*.vercel.app` domain)
- **GitHub Pages**: Settings → Pages → Deploy from branch `main`
- **Cloudflare Pages**: connect repo → Deploy

## License
MIT
