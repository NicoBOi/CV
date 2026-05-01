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
