/* ══════════════════════════════════════════════
   sempere.studio — pipeline JS
   Fondation propre. Sections vides : aucun IIFE par scène à ce stade.
   Architecture : window.__cv exposé pour les futures scènes.
   ══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   FONDATION — scroll restoration + libs check + API publique
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  // Au refresh : on remonte toujours en haut, jamais de scroll auto-restored
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  window.addEventListener('load', () => { window.scrollTo(0, 0); }, { once: true });

  // Reduced-motion : bypass GSAP, fallback statique propre
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.documentElement.classList.add('reduced-motion');
    window.__cv = { reduced: true };
    return;
  }

  // Vérification libs : sans GSAP, on garde le DOM brut
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[cv] GSAP ou ScrollTrigger absent : fallback statique');
    return;
  }

  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.defaults({ markers: false });

  // API publique consommée par les futures scènes
  window.__cv = {
    gsap,
    ScrollTrigger,
    eases: {
      out:  'cubic-bezier(0.22, 1, 0.36, 1)',
      snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
      iris: 'cubic-bezier(0.65, 0, 0.35, 1)',
    },
  };
})();

/* ──────────────────────────────────────────────
   CHROME GLOBAL — chapitre + barre + mode swap
   Single rAF observer : détecte la scène à viewport-center,
   met à jour compteur, swap body data-mode.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const current = document.querySelector('.chapter__current');
  const fill    = document.querySelector('.progress__fill');
  const scenes  = Array.from(document.querySelectorAll('[data-scene][data-scene-num]'));
  if (!scenes.length) return;

  let raf = null;
  let lastNum  = '';
  let lastMode = '';

  const update = () => {
    raf = null;

    // 1) Barre de progression : position globale dans le document
    if (fill) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.width = (p * 100).toFixed(2) + '%';
    }

    // 2) Détection scène à viewport-center
    const center = window.innerHeight / 2;
    let active = scenes[0];
    for (const s of scenes) {
      const r = s.getBoundingClientRect();
      if (r.top <= center && r.bottom >= center) { active = s; break; }
    }

    // 3) Compteur de chapitre
    const num = active.dataset.sceneNum || '01';
    if (num !== lastNum && current) {
      lastNum = num;
      current.textContent = String(num).padStart(2, '0');
    }

    // 4) Mode swap body (porte la palette globale)
    const mode = active.dataset.mode;
    if (mode && mode !== lastMode) {
      lastMode = mode;
      document.body.dataset.mode = mode;
    }
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

/* ──────────────────────────────────────────────
   01 — HERO
   Entry stagger autoplay + convergence scroll-driven (sticky CSS, pas de pin GSAP).
   Positions calculées via offsetLeft/Top : transforms-immune.
   Setup gated par document.fonts.ready : aucune mesure avant que la typo soit rendue.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cv = window.__cv;
  if (!cv || cv.reduced) return;

  const { gsap, ScrollTrigger, eases } = cv;

  const scene = document.querySelector('.scene--hero');
  if (!scene) return;

  const stage = scene.querySelector('.hero__stage');
  const words = scene.querySelectorAll('.hero__word');
  const claim = scene.querySelector('.hero__claim');
  if (!stage || !words.length) return;

  // État initial unique — gsap.set AVANT toute timeline
  gsap.set(words, { opacity: 0, x: 0, y: 0, scale: 1 });
  if (claim) gsap.set(claim, { opacity: 0, scale: 0.92 });

  // Cache positions cibles (offsetLeft/Top : ignore les transforms GSAP)
  const positions = new Array(words.length);
  const refreshPositions = () => {
    const cx = stage.offsetWidth / 2;
    const cy = stage.offsetHeight / 2;
    words.forEach((w, i) => {
      positions[i] = {
        x: cx - (w.offsetLeft + w.offsetWidth / 2),
        y: cy - (w.offsetTop + w.offsetHeight / 2),
      };
    });
  };

  // Setup : positions + entry autoplay + convergence ScrollTrigger
  const setup = () => {
    refreshPositions();

    // Entry autoplay — révélation posée des 6 mots (~3s total)
    gsap.to(words, {
      opacity: 1,
      duration: 0.5,
      stagger: { each: 0.35, from: 'random' },
      ease: eases.out,
    });

    // Convergence scroll-driven — sticky CSS gère le pin, ScrollTrigger gère le scrub
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true,
        onRefresh: refreshPositions,
      },
    });

    // Pause initiale : laisse le visiteur lire les 6 mots dispersés avant convergence
    tl.to({}, { duration: 0.4 });

    // Convergence : tous les mots vers le centre, simultanément
    words.forEach((w, i) => {
      tl.fromTo(w,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
          x: () => positions[i] ? positions[i].x : 0,
          y: () => positions[i] ? positions[i].y : 0,
          scale: 0.4,
          opacity: 0,
          ease: eases.out,
          duration: 1,
        },
        0.4
      );
    });

    // Claim "Une personne." — apparaît dans la 2e moitié de la convergence
    if (claim) {
      tl.fromTo(claim,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, ease: eases.out, duration: 0.6 },
        1.0
      );
    }

    ScrollTrigger.refresh();
  };

  // Gate fonts.ready : aucune mesure layout avant que tous les axes/poids soient rendus
  if ('fonts' in document && document.fonts.ready) {
    document.fonts.ready.then(setup);
  } else {
    setup();
  }

  window.addEventListener('resize', refreshPositions);
})();

/* ──────────────────────────────────────────────
   02 — POSITION
   "Nicolas" descend, "Sempere" monte, rendezvous au centre.
   Reveal scrubbed sur l'entrée de la scène (top 80% → top 20%) → réversible nativement.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cv = window.__cv;
  if (!cv || cv.reduced) return;

  const { gsap, eases } = cv;

  const scene = document.querySelector('.scene--position');
  if (!scene) return;

  const marker = scene.querySelector('.position__marker');
  const top    = scene.querySelector('.position__row--top');
  const bottom = scene.querySelector('.position__row--bottom');
  const stack  = scene.querySelector('.position__stack');
  if (!top || !bottom) return;

  // État initial unique : nom hors-champ haut/bas, marker + stack offset+invisible
  gsap.set(top,    { yPercent: -50, opacity: 0 });
  gsap.set(bottom, { yPercent:  50, opacity: 0 });
  gsap.set([marker, stack].filter(Boolean), { opacity: 0, y: 20 });

  // Reveal scrubbed : se joue sur les 60% du viewport en entrée de scène
  gsap.timeline({
    defaults: { ease: eases.out },
    scrollTrigger: {
      trigger: scene,
      start: 'top 80%',
      end: 'top 20%',
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  })
    .to(marker, { opacity: 1, y: 0, duration: 0.5 }, 0)
    .to(top,    { yPercent: 0, opacity: 1, duration: 1 }, 0.1)
    .to(bottom, { yPercent: 0, opacity: 1, duration: 1 }, 0.1)
    .to(stack,  { opacity: 1, y: 0, duration: 0.5 }, 0.7);
})();

/* ──────────────────────────────────────────────
   03 — RÉFÉRENCES
   Reveal stagger des 7 noms via clip-path inset (gauche → droite).
   Trigger sur la liste (où les noms vivent) — pas sur la section.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cv = window.__cv;
  if (!cv || cv.reduced) return;

  const { gsap, eases } = cv;

  const scene = document.querySelector('.scene--references');
  if (!scene) return;

  const list  = scene.querySelector('.references__list');
  const names = scene.querySelectorAll('.references__name');
  if (!list || !names.length) return;

  gsap.timeline({
    defaults: { ease: eases.out, duration: 0.7 },
    scrollTrigger: {
      trigger: list,
      start: 'top 80%',
      end: 'bottom 30%',
      toggleActions: 'play none play reverse',
    },
  })
    .to(names, {
      clipPath: 'inset(-0.25em 0% -0.25em 0)',
      stagger: 0.12,
    });
})();

/* ──────────────────────────────────────────────
   04 — CONVICTION
   Manifeste 3 phrases pinnées via CSS sticky (zéro pin GSAP).
   Trigger sur l'inner sticky → sync visuel/animation.
   Reading pauses entre transitions, fade-out final.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const cv = window.__cv;
  if (!cv || cv.reduced) return;

  const { gsap, eases } = cv;

  const scene = document.querySelector('.scene--conviction');
  if (!scene) return;

  const inner   = scene.querySelector('.conviction__inner');
  const phrases = scene.querySelectorAll('.conviction__phrase');
  const dots    = scene.querySelectorAll('.conviction__dot');
  if (!inner || phrases.length !== 3) return;

  // État initial : phrase 0 nette, phrases 1 et 2 floues + cachées
  gsap.set(phrases, { autoAlpha: 0, filter: 'blur(20px)' });
  gsap.set(phrases[0], { autoAlpha: 1, filter: 'blur(0px)' });
  if (dots[0]) dots[0].classList.add('is-active');

  const tl = gsap.timeline({
    defaults: { ease: eases.out, duration: 1 },
    scrollTrigger: {
      trigger: inner,
      start: 'top top',
      end: '+=300%',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const idx = Math.min(2, Math.floor(self.progress * 3));
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      },
    },
  });

  // Lecture phrase 0
  tl.to({}, { duration: 0.6 });

  // Phase 0 → 1
  tl.to(phrases[0], { autoAlpha: 0, filter: 'blur(20px)' })
    .to(phrases[1], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');

  // Lecture phrase 1
  tl.to({}, { duration: 0.6 });

  // Phase 1 → 2
  tl.to(phrases[1], { autoAlpha: 0, filter: 'blur(20px)' })
    .to(phrases[2], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');

  // Lecture phrase 2 + fade-out final (évite drag pendant sticky release)
  tl.to({}, { duration: 0.6 })
    .to(phrases[2], { autoAlpha: 0, filter: 'blur(20px)', duration: 0.3 });
})();
