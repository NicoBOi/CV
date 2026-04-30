/* ──────────────────────────────────────────────
   sempere.studio — pipeline fondation
   Lenis (smooth scroll) + GSAP/ScrollTrigger.
   API publique : window.__cinematic
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  document.documentElement.classList.add('js');

  // Bypass total si l'utilisateur préfère réduire le mouvement
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.documentElement.classList.add('reduced-motion');
    window.__cinematic = { reduced: true };
    return;
  }

  // Enregistre le plugin GSAP
  gsap.registerPlugin(ScrollTrigger);

  // Lenis : smooth scroll, momentum natif sur iOS (réactivité)
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });

  // Synchronisation Lenis ↔ ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anti-jank pin sur iOS Safari
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.defaults({ markers: false });

  // API publique consommée par les futures scènes
  window.__cinematic = {
    lenis,
    gsap,
    ScrollTrigger,
    eases: {
      cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      iris:      'cubic-bezier(0.65, 0, 0.35, 1)',
      snap:      'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    /* Helper : bascule un thème sur le doc ou sur un élément scène */
    setTheme(target, theme) {
      if (typeof target === 'string') {
        document.documentElement.dataset.theme = target;
      } else if (target instanceof Element) {
        target.dataset.theme = theme;
      }
    },
  };
})();

/* ──────────────────────────────────────────────
   SCÈNE 1 — HERO
   Apparition staggered + convergence pinned au scroll
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, ScrollTrigger, eases } = cine;

  const scene = document.querySelector('.scene-hero');
  if (!scene) return;

  const stage = scene.querySelector('.scene-hero__stage');
  const words = scene.querySelectorAll('.scene-hero__word');
  const name  = scene.querySelector('.scene-hero__name');

  /* 1) Entrée : un par un, ordre aléatoire, pas tous d'un coup */
  gsap.timeline({ defaults: { ease: eases.cinematic } })
    .to(words, {
      opacity: 1,
      duration: 0.55,
      stagger: { each: 0.16, from: 'random' },
    });

  /* 2) Convergence : pin de la scène, scroll → mots vers centre, "sempere" émerge.
        Function-based values + invalidateOnRefresh : robuste au resize. */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=120%',
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });

  words.forEach((w) => {
    tl.to(w, {
      // Delta vers le centre du stage, recalculé à chaque refresh
      x: () => {
        const s = stage.getBoundingClientRect();
        const r = w.getBoundingClientRect();
        return (s.left + s.width / 2) - (r.left + r.width / 2);
      },
      y: () => {
        const s = stage.getBoundingClientRect();
        const r = w.getBoundingClientRect();
        return (s.top + s.height / 2) - (r.top + r.height / 2);
      },
      scale: 0.35,
      opacity: 0,
      ease: eases.cinematic,
    }, 0);
  });

  // "sempere" se révèle pendant la 2e moitié de la convergence
  tl.to(name, {
    opacity: 1,
    scale: 1,
    ease: eases.cinematic,
  }, 0.4);
})();
