/* ════════════════════════════════════════════════════════════════════
   sempere.studio — fondation cinématique
   ─────────────────────────────────────────────────────────────────────
   Init pipeline uniquement.
   Stack: GSAP 3.12 + ScrollTrigger + Lenis (CDN, defer-loaded).

   Aucune timeline scène — chaque scène arrivera dans son propre prompt
   et utilisera l'API exposée sur `window.__cinematic`.
   ════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  document.documentElement.classList.add('js');

  /* ── prefers-reduced-motion : bypass Lenis + GSAP scroll-driven anims.
        Scroll natif, contenu lisible immédiatement. Réactivité d'abord. ── */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.documentElement.classList.add('reduced-motion');
    return;
  }

  /* ── GSAP plugin registration ─────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  /* ── Lenis : smooth scroll, sync via gsap.ticker ──────────────────── */
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,   // iOS garde son momentum natif (plus réactif)
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  /* ── Sync ScrollTrigger ↔ Lenis ───────────────────────────────────── */
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ── ScrollTrigger config — anti-jank pour pin sur iOS Safari ─────── */
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.defaults({ markers: false });

  /* ── API exposée pour les scènes futures ──────────────────────────── */
  window.__cinematic = {
    lenis,
    gsap,
    ScrollTrigger,
    /* Easings tokenisés pour réutilisation par les scènes. */
    eases: {
      cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      iris:      'cubic-bezier(0.65, 0, 0.35, 1)',
      snap:      'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
})();
