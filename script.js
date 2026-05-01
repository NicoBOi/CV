/* ══════════════════════════════════════════════
   sempere.studio — pipeline JS bulletproof
   Toutes les inits ScrollTrigger sont DIFFÉRÉES jusqu'à ce que :
   • document.fonts.ready (toutes fonts rendered)
   • window.load (toutes ressources chargées)
   • Double rAF + ScrollTrigger.refresh() (layout final stable)
   Plus de race condition possible.
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
    window.__cv = { reduced: true, setups: [] };
    return;
  }

  // Vérification libs : sans GSAP, on garde le DOM brut
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[cv] GSAP ou ScrollTrigger absent : fallback statique');
    window.__cv = { setups: [] };
    return;
  }

  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.defaults({ markers: false });

  // API publique consommée par les futures scènes.
  // setups[] : queue de fonctions exécutées APRÈS fonts.ready + window.load
  window.__cv = {
    gsap,
    ScrollTrigger,
    eases: {
      out:  'cubic-bezier(0.22, 1, 0.36, 1)',
      snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
      iris: 'cubic-bezier(0.65, 0, 0.35, 1)',
    },
    setups: [],
  };
})();

/* ──────────────────────────────────────────────
   CHROME GLOBAL — chapitre + barre + mode swap
   Pas de ScrollTrigger ici, juste rAF scroll. Init immédiat OK.
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

    if (fill) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.width = (p * 100).toFixed(2) + '%';
    }

    const center = window.innerHeight / 2;
    let active = scenes[0];
    for (const s of scenes) {
      const r = s.getBoundingClientRect();
      if (r.top <= center && r.bottom >= center) { active = s; break; }
    }

    const num = active.dataset.sceneNum || '01';
    if (num !== lastNum && current) {
      lastNum = num;
      current.textContent = String(num).padStart(2, '0');
    }

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

/* ══════════════════════════════════════════════
   SECTIONS — chaque IIFE PUSH son setup au queue __cv.setups
   au lieu de créer le ScrollTrigger immédiatement.
   ══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   01 — HERO : 6 mots → "Vous cherchez un designer. Vraiment ?"
   ────────────────────────────────────────────── */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, ScrollTrigger, eases } = cv;
    const scene = document.querySelector('.scene--hero');
    if (!scene) return;

    const stage = scene.querySelector('.hero__stage');
    const words = scene.querySelectorAll('.hero__word');
    const claim = scene.querySelector('.hero__claim');
    if (!stage || !words.length) return;

    // État initial unique
    gsap.set(words, { opacity: 0, x: 0, y: 0, scale: 1 });
    if (claim) gsap.set(claim, { opacity: 0, scale: 0.92 });

    // Cache positions cibles via offsetLeft/Top (transforms-immune)
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
    refreshPositions();

    // Entry autoplay — 0.8s entre chaque mot, ordre random (~5.3s reveal)
    gsap.to(words, {
      opacity: 1,
      duration: 0.7,
      stagger: { each: 0.8, from: 'random' },
      ease: eases.out,
    });

    // Convergence scroll-driven via sticky CSS
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

    // Pause initiale : lecture des 6 mots dispersés
    tl.to({}, { duration: 0.4 });

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

    if (claim) {
      tl.fromTo(claim,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, ease: eases.out, duration: 0.6 },
        1.0
      );
    }

    window.addEventListener('resize', refreshPositions);
  });
})();

/* ──────────────────────────────────────────────
   02 — POSITION : Nicolas / Sempere rendezvous
   ────────────────────────────────────────────── */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--position');
    if (!scene) return;

    const marker = scene.querySelector('.position__marker');
    const top    = scene.querySelector('.position__row--top');
    const bottom = scene.querySelector('.position__row--bottom');
    const stack  = scene.querySelector('.position__stack');
    if (!top || !bottom) return;

    gsap.set(top,    { yPercent: -50, opacity: 0 });
    gsap.set(bottom, { yPercent:  50, opacity: 0 });
    gsap.set([marker, stack].filter(Boolean), { opacity: 0, y: 20 });

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
  });
})();

/* ──────────────────────────────────────────────
   03 — RÉFÉRENCES : 7 noms clip-path stagger
   ────────────────────────────────────────────── */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
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
  });
})();

/* ──────────────────────────────────────────────
   04 — CONVICTION : 3 phrases sticky scrub
   ────────────────────────────────────────────── */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--conviction');
    if (!scene) return;

    const inner   = scene.querySelector('.conviction__inner');
    const phrases = scene.querySelectorAll('.conviction__phrase');
    const dots    = scene.querySelectorAll('.conviction__dot');
    if (!inner || phrases.length !== 3) return;

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

    tl.to({}, { duration: 0.6 });
    tl.to(phrases[0], { autoAlpha: 0, filter: 'blur(20px)' })
      .to(phrases[1], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');
    tl.to({}, { duration: 0.6 });
    tl.to(phrases[1], { autoAlpha: 0, filter: 'blur(20px)' })
      .to(phrases[2], { autoAlpha: 1, filter: 'blur(0px)' }, '<0.15');
    tl.to({}, { duration: 0.6 })
      .to(phrases[2], { autoAlpha: 0, filter: 'blur(20px)', duration: 0.3 });
  });
})();

/* ──────────────────────────────────────────────
   05 — PROJETS : carrousel dots indicator (rAF, pas de ScrollTrigger)
   Init immédiat OK.
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const rail = document.querySelector('.projects__rail');
  const dots = document.querySelectorAll('.projects__dot');
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
   LAZY-LOAD VIDÉOS — IntersectionObserver, init immédiat OK
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
      v.play().catch(() => {});
      obs.unobserve(v);
    });
  }, { rootMargin: '300px 0px' });

  videos.forEach((v) => obs.observe(v));
})();

/* ──────────────────────────────────────────────
   06 — TÉMOIGNAGE : reveal lignes clip-path
   ────────────────────────────────────────────── */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--testimony');
    if (!scene) return;

    const lines = scene.querySelectorAll('.testimony__line');
    if (!lines.length) return;

    gsap.set(lines, { clipPath: 'inset(0 100% 0 0)' });

    gsap.timeline({
      defaults: { ease: eases.out, duration: 0.9 },
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
  });
})();

/* ──────────────────────────────────────────────
   07 — OBJECTIONS : reveal pair par pair + arrow scrubbed
   ────────────────────────────────────────────── */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--objections');
    if (!scene) return;

    scene.querySelectorAll('.objections__pair').forEach((pair) => {
      gsap.timeline({
        defaults: { ease: eases.out },
        scrollTrigger: {
          trigger: pair,
          start: 'top 75%',
          end: 'bottom 25%',
          toggleActions: 'play none play reverse',
        },
      })
        .to(pair, { opacity: 1, y: 0, duration: 0.8 });

      const path = pair.querySelector('.objections__arrow path');
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
  });
})();

/* ══════════════════════════════════════════════
   ORCHESTRATEUR — exécute tous les setups APRÈS fonts.ready + window.load
   Garantit que les positions DOM sont stables avant toute mesure.
   Double rAF + ScrollTrigger.refresh() pour layout final.
   ══════════════════════════════════════════════ */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups || !cv.ScrollTrigger) return;

  const fontsReady = ('fonts' in document && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve();

  const windowLoaded = (document.readyState === 'complete')
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));

  Promise.all([fontsReady, windowLoaded]).then(() => {
    // Exécute toutes les inscriptions de scènes
    cv.setups.forEach(fn => {
      try { fn(); } catch (e) { console.warn('[cv] setup error', e); }
    });
    // Layout final : double rAF garantit que le browser a appliqué tous les styles,
    // puis ScrollTrigger.refresh() recalcule toutes les positions.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cv.ScrollTrigger.refresh();
      });
    });
  });
})();
