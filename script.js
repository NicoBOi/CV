/* ──────────────────────────────────────────────
   sempere.studio — pipeline fondation
   GSAP + ScrollTrigger sur scroll natif (Lenis retiré : casse pin+scrub).
   API publique : window.__cinematic
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  // Force le scroll à zéro au refresh (évite la restauration auto qui démarre mi-scène).
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  window.addEventListener('load', () => { window.scrollTo(0, 0); }, { once: true });

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
   Single setup IIFE. Entry autoplay (verrouillé 0.5s/word, plus jamais retouché)
   + convergence scroll-driven. État initial unique via gsap.set().
   Plus de chained add(callback), plus de timelines en conflit.
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

  // État initial unique — défini une seule fois, jamais surchargé ailleurs
  gsap.set(words, { opacity: 0, x: 0, y: 0, scale: 1 });
  if (claim) gsap.set(claim, { opacity: 0, y: 20 });

  // Cache positions cibles convergence — recalculées après fonts.ready / resize
  const positions = new Array(words.length);
  const refreshPositions = () => {
    const sr = stage.getBoundingClientRect();
    const cx = sr.left + sr.width / 2;
    const cy = sr.top + sr.height / 2;
    console.warn('[hero] refreshPositions — stage:', { cx: cx.toFixed(1), cy: cy.toFixed(1), w: sr.width.toFixed(0), h: sr.height.toFixed(0) });
    words.forEach((w, i) => {
      const r = w.getBoundingClientRect();
      positions[i] = {
        x: cx - (r.left + r.width / 2),
        y: cy - (r.top + r.height / 2),
      };
      w.dataset.wordIndex = i;
      console.warn(`[hero] pos[${i}] "${w.textContent}" — Δx: ${positions[i].x.toFixed(1)}, Δy: ${positions[i].y.toFixed(1)}, rect: ${r.width.toFixed(0)}×${r.height.toFixed(0)}`);
    });
  };

  // Setup unique : positions + entry autoplay + convergence ScrollTrigger.
  // Entry's "to" state = convergence's "from" state, donc zéro conflit visuel
  // si l'utilisateur scrolle pendant l'entry.
  const setup = () => {
    refreshPositions();

    // Entry stagger autoplay — 0.5s entre chaque mot, ordre aléatoire (~3.5s total)
    gsap.to(words, {
      opacity: 1,
      duration: 0.5,
      stagger: { each: 0.5, from: 'random' },
      ease: eases.cinematic,
    });

    // Convergence scroll-driven, pin proactif (anticipatePin)
    let firstUpdateLogged = false;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start: 'top top',
        end: '+=70%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,                // engagement pin proactif (anti-saccadé)
        invalidateOnRefresh: true,
        onRefresh: () => {
          refreshPositions();
          console.warn('[hero] ScrollTrigger.onRefresh fired');
        },
        onUpdate: (self) => {
          if (firstUpdateLogged) return;
          firstUpdateLogged = true;
          console.warn('[hero] FIRST scroll update — progress:', self.progress.toFixed(3));
          words.forEach((w, i) => {
            const r = w.getBoundingClientRect();
            console.warn(`  word[${i}] current rect at first update:`, r.left.toFixed(1), r.top.toFixed(1));
          });
        },
      },
    });

    words.forEach((w, i) => {
      tl.fromTo(w,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
          x: () => positions[i] ? positions[i].x : 0,
          y: () => positions[i] ? positions[i].y : 0,
          scale: 0.35,
          opacity: 0,
          ease: eases.cinematic,
        },
      0);
    });

    if (claim) {
      tl.fromTo(claim,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, ease: eases.cinematic },
      0.5);
    }

    ScrollTrigger.refresh();
  };

  // Gate fonts.ready : aucune mesure layout avant que tous les axes/poids/styles soient rendus
  if ('fonts' in document && document.fonts.ready) {
    document.fonts.ready.then(setup);
  } else {
    setup();
  }

  window.addEventListener('resize', refreshPositions);
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

  const list  = scene.querySelector('.scene-clients__list');
  const names = scene.querySelectorAll('.scene-clients__name');
  if (!names.length || !list) return;

  gsap.timeline({
    defaults: { ease: eases.cinematic, duration: 0.7 },
    scrollTrigger: {
      trigger: list,                  // fire sur la LISTE (où les noms sont), pas la section
      start: 'top 80%',
      end: 'bottom 30%',
      toggleActions: 'play none play reverse',
    },
  })
    .to(names, {
      clipPath: 'inset(-0.25em 0% -0.25em 0)',   // marge top/bottom contre cut descenders
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

  // Trigger sur l'inner sticky : sync visuel/animation garantie
  // (l'anim démarre quand l'inner est plaqué au top, pas quand la section entre).
  const inner = scene.querySelector('.scene-manifesto__inner');
  const tl = gsap.timeline({
    defaults: { ease: eases.cinematic, duration: 1 },
    scrollTrigger: {
      trigger: inner,                 // ← inner sticky, pas la section 400dvh
      start: 'top top',
      end: '+=300%',                  // 300% de scroll après l'engage = 3 phases
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const idx = Math.min(2, Math.floor(self.progress * 3));
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      },
    },
  });

  // Lecture phrase 0 : pause AVANT toute transition pour laisser le visiteur lire
  tl.to({}, { duration: 0.6 });

  // Phase 0 → 1
  tl.to(phrases[0], { autoAlpha: 0, filter: 'blur(20px)' })
    .to(phrases[1], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');

  // Lecture phrase 1
  tl.to({}, { duration: 0.6 });

  // Phase 1 → 2
  tl.to(phrases[1], { autoAlpha: 0, filter: 'blur(20px)' })
    .to(phrases[2], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');

  // Lecture phrase 2
  tl.to({}, { duration: 0.6 });

  // Fade-out final de phrase 2 (évite le drag pendant le sticky release)
  tl.to(phrases[2], { autoAlpha: 0, filter: 'blur(20px)', duration: 0.3 });
})();

/* ──────────────────────────────────────────────
   CARROUSEL PROJETS — dots indicator
   Lit la position scroll horizontale du rail, met à jour le dot actif.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const rail = document.querySelector('.scene-projects__rail');
  const dots = document.querySelectorAll('.scene-projects__dot');
  if (!rail || !dots.length) return;

  let raf = null;
  const update = () => {
    raf = null;
    const items = rail.children;
    if (!items.length) return;
    const itemRect = items[0].getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(rail).gap) || 0;
    const stride = itemRect.width + gap;
    const idx = Math.min(dots.length - 1, Math.max(0, Math.round(rail.scrollLeft / stride)));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  rail.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

/* ──────────────────────────────────────────────
   LAZY-LOAD VIDÉOS (générique, toute scène avec video[data-src])
   IntersectionObserver — économie data hors viewport
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const videos = document.querySelectorAll('video[data-src]');
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
   BARRE DE PROGRESSION + MODE SWAP (rAF scroll-based)
   Single IIFE : remplit la barre selon scrollY/maxScroll
   ET détecte la scène à viewport-center pour swap body data-mode.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const fill   = document.querySelector('.progress-bar__fill');
  const scenes = Array.from(document.querySelectorAll('[data-scene][data-mode]'));
  if (!fill && !scenes.length) return;

  let raf = null;
  let lastMode = '';

  const update = () => {
    raf = null;

    // 1) Remplissage barre = position globale dans le document
    if (fill) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.width = (p * 100).toFixed(2) + '%';
    }

    // 2) Mode swap = scène qui contient le centre du viewport
    if (scenes.length) {
      const center = window.innerHeight / 2;
      let active = scenes[0];
      for (const s of scenes) {
        const r = s.getBoundingClientRect();
        if (r.top <= center && r.bottom >= center) { active = s; break; }
      }
      const mode = active.dataset.mode;
      if (mode && mode !== lastMode) {
        lastMode = mode;
        document.body.dataset.mode = mode;
      }
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

