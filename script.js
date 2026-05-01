/* ══════════════════════════════════════════════
   sempere.me — pipeline JS bulletproof
   Toutes les inits ScrollTrigger DIFFÉRÉES dans Promise.all([fonts.ready, window.load])
   + double rAF + ScrollTrigger.refresh(). Zéro race condition.
   ══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   FONDATION — scroll restoration + libs check + API publique
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  window.addEventListener('load', () => { window.scrollTo(0, 0); }, { once: true });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.documentElement.classList.add('reduced-motion');
    window.__cv = { reduced: true, setups: [] };
    return;
  }

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[cv] GSAP ou ScrollTrigger absent : fallback statique');
    window.__cv = { setups: [] };
    return;
  }

  document.documentElement.classList.add('js');
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.defaults({ markers: false });

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
   CHROME GLOBAL — pellicule + barre + mode swap (rAF)
   Init immédiat (pas de ScrollTrigger).
   ────────────────────────────────────────────── */

(() => {
  'use strict';

  const fill    = document.querySelector('.progress__fill');
  const frames  = Array.from(document.querySelectorAll('.filmstrip__frame'));
  const film    = document.querySelector('.filmstrip');
  const scenes  = Array.from(document.querySelectorAll('[data-scene][data-scene-num]'));
  if (!scenes.length) return;

  let raf = null;
  let lastFrame = -1;
  let lastMode  = '';
  let filmOut   = false;

  const update = () => {
    raf = null;

    // Barre de progression
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (fill) fill.style.width = (p * 100).toFixed(2) + '%';

    // Détection scène à viewport-center
    const center = window.innerHeight / 2;
    let active = scenes[0];
    for (const s of scenes) {
      const r = s.getBoundingClientRect();
      if (r.top <= center && r.bottom >= center) { active = s; break; }
    }

    const num = parseInt(active.dataset.sceneNum || '1', 10);

    // Pellicule : highlight de la frame active
    if (num !== lastFrame) {
      lastFrame = num;
      frames.forEach((f, i) => {
        f.classList.toggle('is-active', i === num - 1);
      });
    }

    // Mode swap body
    const mode = active.dataset.mode;
    if (mode && mode !== lastMode) {
      lastMode = mode;
      document.body.dataset.mode = mode;
    }

    // Exit pellicule : quand le visiteur dépasse 95% du scroll global
    if (film) {
      if (p > 0.95 && !filmOut) {
        filmOut = true;
        film.classList.add('is-out');
      } else if (p <= 0.92 && filmOut) {
        filmOut = false;
        film.classList.remove('is-out');
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

/* ══════════════════════════════════════════════
   01 — HERO : "Tout le monde a accès à Sora." → "Personne ne sait quoi en faire."
   ══════════════════════════════════════════════ */

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

    // État initial
    gsap.set(words, { opacity: 0, y: 12 });
    if (claim) gsap.set(claim, { opacity: 0, scale: 0.94 });

    // Entry autoplay : 7 mots, 0.8s entre chaque (~5.6s reveal posé)
    gsap.to(words, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: { each: 0.8, from: 'start' },   // sequential left-to-right
      ease: eases.out,
    });

    // Convergence scroll-driven : sticky CSS pin, scrub timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });

    // Pause initiale : laisse l'utilisateur lire la phrase entière
    tl.to({}, { duration: 0.4 });

    // Phase 1 : blur+fade-out de la phrase complète (tous les mots ensemble)
    tl.to(words, {
      opacity: 0,
      filter: 'blur(20px)',
      y: -10,
      stagger: 0.04,
      ease: eases.out,
      duration: 0.8,
    }, 0.4);

    // Phase 2 : claim émerge
    if (claim) {
      tl.fromTo(claim,
        { opacity: 0, scale: 0.94, filter: 'blur(20px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', ease: eases.out, duration: 0.8 },
        0.9
      );
    }
  });
})();

/* ══════════════════════════════════════════════
   02 — POSITION : Nicolas / Sempere rendezvous
   ══════════════════════════════════════════════ */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--position');
    if (!scene) return;

    const top    = scene.querySelector('.position__row--top');
    const bottom = scene.querySelector('.position__row--bottom');
    const stack  = scene.querySelector('.position__stack');
    if (!top || !bottom) return;

    gsap.set(top,    { yPercent: -50, opacity: 0 });
    gsap.set(bottom, { yPercent:  50, opacity: 0 });
    if (stack) gsap.set(stack, { opacity: 0, y: 20 });

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
      .to(top,    { yPercent: 0, opacity: 1, duration: 1 }, 0)
      .to(bottom, { yPercent: 0, opacity: 1, duration: 1 }, 0)
      .to(stack,  { opacity: 1, y: 0, duration: 0.5 }, 0.7);
  });
})();

/* ══════════════════════════════════════════════
   03 — STACK : 8 outils clip-path stagger
   ══════════════════════════════════════════════ */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--stack');
    if (!scene) return;

    const list  = scene.querySelector('.stack__list');
    const tools = scene.querySelectorAll('.stack__tool');
    const lede  = scene.querySelector('.stack__lede');
    if (!list || !tools.length) return;

    if (lede) gsap.set(lede, { opacity: 0, y: 20 });

    const tl = gsap.timeline({
      defaults: { ease: eases.out, duration: 0.7 },
      scrollTrigger: {
        trigger: list,
        start: 'top 80%',
        end: 'bottom 30%',
        toggleActions: 'play none play reverse',
      },
    });

    if (lede) tl.to(lede, { opacity: 1, y: 0, duration: 0.6 }, 0);

    tl.to(tools, {
      clipPath: 'inset(-0.25em 0% -0.25em 0)',
      stagger: 0.1,
    }, 0.2);
  });
})();

/* ══════════════════════════════════════════════
   04 — CONVICTION : 3 phrases sticky scrub
   ══════════════════════════════════════════════ */

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
    // Lecture phrase 2 + fade-out final
    tl.to({}, { duration: 0.6 })
      .to(phrases[2], { autoAlpha: 0, filter: 'blur(20px)', duration: 0.3 });
  });
})();

/* ══════════════════════════════════════════════
   05 — PROJETS : carrousel dots indicator (rAF, init immédiat)
   ══════════════════════════════════════════════ */

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

/* Lazy-load vidéos — IntersectionObserver, init immédiat */
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

/* ══════════════════════════════════════════════
   06 — RÉFÉRENCES : 7 marques clip-path stagger
   ══════════════════════════════════════════════ */

(() => {
  'use strict';
  const cv = window.__cv;
  if (!cv || cv.reduced || !cv.setups) return;

  cv.setups.push(() => {
    const { gsap, eases } = cv;
    const scene = document.querySelector('.scene--references');
    if (!scene) return;

    const list  = scene.querySelector('.references__list');
    const lede  = scene.querySelector('.references__lede');
    const names = scene.querySelectorAll('.references__name');
    if (!list || !names.length) return;

    if (lede) gsap.set(lede, { opacity: 0, y: 20 });

    const tl = gsap.timeline({
      defaults: { ease: eases.out, duration: 0.7 },
      scrollTrigger: {
        trigger: list,
        start: 'top 80%',
        end: 'bottom 30%',
        toggleActions: 'play none play reverse',
      },
    });

    if (lede) tl.to(lede, { opacity: 1, y: 0, duration: 0.6 }, 0);

    tl.to(names, {
      clipPath: 'inset(-0.25em 0% -0.25em 0)',
      stagger: 0.12,
    }, 0.2);
  });
})();

/* ══════════════════════════════════════════════
   ORCHESTRATEUR — exécute tous les setups APRÈS fonts.ready + window.load
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
    cv.setups.forEach(fn => {
      try { fn(); } catch (e) { console.warn('[cv] setup error', e); }
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cv.ScrollTrigger.refresh();
      });
    });
  });
})();
