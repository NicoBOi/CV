/* ──────────────────────────────────────────────
   sempere.studio — pipeline fondation
   GSAP + ScrollTrigger sur scroll natif (Lenis retiré : casse pin+scrub).
   API publique : window.__cinematic
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  // Bypass total si l'utilisateur préfère réduire le mouvement
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.documentElement.classList.add('reduced-motion');
    window.__cinematic = { reduced: true };
    return;
  }

  // Vérification libs : sans GSAP, on garde le DOM brut visible (pas de .js)
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[sempere] GSAP ou ScrollTrigger absent : fallback statique');
    return;
  }

  // OK, on prend la main
  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);

  // Anti-jank pin sur iOS Safari
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.defaults({ markers: false });

  // API publique consommée par les scènes
  window.__cinematic = {
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

  // Refresh après que tous les IIFEs aient enregistré leurs ScrollTriggers
  requestAnimationFrame(() => ScrollTrigger.refresh());
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

  /* 1) Entrée : on cache d'abord (CSS visible par défaut → fallback no-JS),
        puis stagger révélé un par un, ordre aléatoire. */
  gsap.set(words, { opacity: 0 });
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

/* ──────────────────────────────────────────────
   SCÈNE 3 — IDENTITÉ
   "Nicolas" descend, "Sempere" monte, rendezvous au centre
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, eases } = cine;
  const scene = document.querySelector('.scene-identity');
  if (!scene) return;

  const top    = scene.querySelector('.scene-identity__row--top');
  const bottom = scene.querySelector('.scene-identity__row--bottom');
  const marker = scene.querySelector('.scene-identity__marker');
  const cap    = scene.querySelector('.scene-identity__caption');

  // État initial : nom hors-champ (haut + bas), marker/légende fade
  gsap.set(top,    { yPercent: -200, opacity: 0 });
  gsap.set(bottom, { yPercent:  200, opacity: 0 });
  gsap.set([marker, cap], { opacity: 0, y: 20 });

  // Entrée orchestrée au passage du milieu d'écran (one-shot)
  gsap.timeline({
    defaults: { ease: eases.cinematic },
    scrollTrigger: { trigger: scene, start: 'top 70%', once: true },
  })
    .to(marker, { opacity: 1, y: 0, duration: 0.6 })
    .to(top,    { yPercent: 0, opacity: 1, duration: 1.2 }, 0.1)
    .to(bottom, { yPercent: 0, opacity: 1, duration: 1.2 }, 0.1)
    .to(cap,    { opacity: 1, y: 0, duration: 0.6 }, 0.6);
})();

/* ──────────────────────────────────────────────
   SCÈNE 4 — TRANSITION SOMBRE
   Iris circulaire scrubbed pendant le pin de la scène
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, eases } = cine;
  const scene = document.querySelector('.scene-transition');
  if (!scene) return;

  const iris = scene.querySelector('.scene-transition__iris');

  gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=100%',
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  })
    .fromTo(iris,
      { scale: 0 },
      { scale: 1, ease: eases.iris }
    );
})();

/* ──────────────────────────────────────────────
   SCÈNE 5 — MANIFESTE
   Pin × 3 vues, blur out / sharp in entre 3 phrases,
   indicator "01—02—03" pulse en terracotta sur l'actif.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, eases } = cine;
  const scene = document.querySelector('.scene-manifesto');
  if (!scene) return;

  const phrases = scene.querySelectorAll('.scene-manifesto__phrase');
  const dots    = scene.querySelectorAll('.scene-manifesto__dot');
  if (phrases.length !== 3) return;

  // Initial : phrases 1 et 2 floues + invisibles, phrase 0 nette + visible
  gsap.set(phrases, { autoAlpha: 0, filter: 'blur(20px)' });
  gsap.set(phrases[0], { autoAlpha: 1, filter: 'blur(0px)' });
  dots[0].classList.add('is-active');

  const tl = gsap.timeline({
    defaults: { ease: eases.cinematic, duration: 1 },
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=300%',                  // 3 vues de scroll
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Indicator : 0..0.33 → step 0, 0.33..0.66 → 1, 0.66..1 → 2
        const idx = Math.min(2, Math.floor(self.progress * 3));
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      },
    },
  });

  // Phase 0 → 1
  tl.to(phrases[0], { autoAlpha: 0, filter: 'blur(20px)' })
    .to(phrases[1], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');

  // Pause de lecture (timeline avance, phrases stables)
  tl.to({}, { duration: 0.5 });

  // Phase 1 → 2
  tl.to(phrases[1], { autoAlpha: 0, filter: 'blur(20px)' })
    .to(phrases[2], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');
})();
