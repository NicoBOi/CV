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
  const claim = scene.querySelector('.scene-hero__claim');

  /* 1) Entrée : on cache d'abord (CSS visible par défaut → fallback no-JS),
        puis stagger révélé un par un, ordre aléatoire. */
  gsap.set(words, { opacity: 0 });
  gsap.timeline({ defaults: { ease: eases.cinematic } })
    .to(words, {
      opacity: 1,
      duration: 0.55,
      stagger: { each: 0.16, from: 'random' },
    });

  /* 2) Convergence scrubbed : pin de la scène, scroll → mots vers centre.
        fromTo explicite pour garantir réversibilité (scroll up = restauration). */
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=70%',           // pin réduit (220dvh → 170dvh)
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });

  words.forEach((w) => {
    tl.fromTo(w,
      { x: 0, y: 0, scale: 1, opacity: 1 },
      {
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
      },
    0);
  });

  // Phrase-promesse révélée pendant la 2e moitié de la convergence
  if (claim) {
    tl.fromTo(claim,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, ease: eases.cinematic },
    0.5);
  }
})();

/* ──────────────────────────────────────────────
   SCÈNE — RÉFÉRENCES
   Reveal stagger des noms via clip-path inset, réversible
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, eases } = cine;
  const scene = document.querySelector('.scene-clients');
  if (!scene) return;

  const names = scene.querySelectorAll('.scene-clients__name');
  if (!names.length) return;

  gsap.timeline({
    defaults: { ease: eases.cinematic, duration: 0.7 },
    scrollTrigger: {
      trigger: scene,
      start: 'top 75%',
      end: 'bottom 25%',
      toggleActions: 'play none play reverse',
    },
  })
    .to(names, {
      clipPath: 'inset(0 0% 0 0)',
      stagger: 0.12,
    });
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

  // Entrée orchestrée — réversible : reverse au scroll up sortant
  gsap.timeline({
    defaults: { ease: eases.cinematic },
    scrollTrigger: {
      trigger: scene,
      start: 'top 70%',
      end: 'bottom 30%',
      toggleActions: 'play none play reverse',
    },
  })
    .to(marker, { opacity: 1, y: 0, duration: 0.6 })
    .to(top,    { yPercent: 0, opacity: 1, duration: 1.2 }, 0.1)
    .to(bottom, { yPercent: 0, opacity: 1, duration: 1.2 }, 0.1)
    .to(cap,    { opacity: 1, y: 0, duration: 0.6 }, 0.6);
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

/* ──────────────────────────────────────────────
   SCÈNE 7 — CASE STUDY
   Lazy-load vidéo via IntersectionObserver (économie data hors viewport)
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const videos = document.querySelectorAll('.scene-case__video[data-src]');
  if (!videos.length || !('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const v = e.target;
      v.src = v.dataset.src;
      v.load();
      // Tente lecture (autoplay muet : navigateurs autorisent)
      v.play().catch(() => { /* ignore : autoplay refusé */ });
      obs.unobserve(v);
    });
  }, { rootMargin: '300px 0px' });

  videos.forEach((v) => obs.observe(v));
})();

/* ──────────────────────────────────────────────
   SCÈNE 9 — TÉMOIGNAGE
   Reveal ligne par ligne via clip-path inset gauche → droite
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, eases } = cine;
  const scene = document.querySelector('.scene-quote');
  if (!scene) return;

  const lines = scene.querySelectorAll('.scene-quote__line');
  if (!lines.length) return;

  // Initial : chaque ligne masquée à droite (visible 0% sur la gauche)
  gsap.set(lines, { clipPath: 'inset(0 100% 0 0)' });

  gsap.timeline({
    defaults: { ease: eases.cinematic, duration: 0.9 },
    scrollTrigger: {
      trigger: scene,
      start: 'top 70%',
      end: 'bottom 30%',
      toggleActions: 'play none play reverse',
    },
  })
    .to(lines, {
      clipPath: 'inset(0 0% 0 0)',
      stagger: 0.15,
    });
})();

/* ──────────────────────────────────────────────
   SCÈNE 10 — OBJECTIONS
   Reveal pair-by-pair + tracé de flèche scrubbed
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cine = window.__cinematic;
  if (!cine || cine.reduced) return;

  const { gsap, eases } = cine;
  const scene = document.querySelector('.scene-objections');
  if (!scene) return;

  scene.querySelectorAll('.scene-objections__pair').forEach((pair) => {
    // Reveal réversible — reverse au scroll up sortant
    gsap.timeline({
      scrollTrigger: {
        trigger: pair,
        start: 'top 75%',
        end: 'bottom 25%',
        toggleActions: 'play none play reverse',
      },
      defaults: { ease: eases.cinematic },
    })
      .to(pair, { opacity: 1, y: 0, duration: 0.8 });

    // Tracé de flèche : scrubbed (déjà réversible par nature)
    const path = pair.querySelector('.scene-objections__arrow path');
    if (path) {
      gsap.fromTo(path,
        { strokeDashoffset: 200 },
        {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: pair,
            start: 'top 70%',
            end: 'top 30%',
            scrub: 0.5,
          },
        }
      );
    }
  });
})();

/* ──────────────────────────────────────────────
   COMPTEUR + MODE SWAP (hard cut, sans overlay)
   Observer unique : détecte la scène active, met à jour le compteur,
   swap instant body data-mode → fond hérite via la transition body 400ms.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const current = document.querySelector('.scene-counter__current');
  const scenes  = document.querySelectorAll('[data-scene][data-scene-num]');
  if (!current || !scenes.length || !('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && e.intersectionRatio > 0.45) {
        const num = e.target.dataset.sceneNum || '01';
        current.textContent = String(num).padStart(2, '0');

        const mode = e.target.dataset.mode;
        if (mode && document.body.dataset.mode !== mode) {
          document.body.dataset.mode = mode;
        }
      }
    });
  }, { threshold: [0.45, 0.55] });

  scenes.forEach((s) => obs.observe(s));
})();

/* ──────────────────────────────────────────────
   FIL CONDUCTEUR — fill scrubbed sur scroll global
   rAF-throttled pour ne pas bloquer le main thread.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const fill = document.querySelector('.thread__fill');
  if (!fill) return;

  let raf = null;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    fill.style.height = (p * 100).toFixed(2) + '%';
    raf = null;
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
