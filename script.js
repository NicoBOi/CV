/* ============================================================
   Nicolas Sempere — site CV
   - Lenis : smooth scroll
   - GSAP/ScrollTrigger : reveals + theme swap + counter
   - Vanilla : showreel play, year, prefers-reduced-motion guard
   ============================================================ */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year stamp ---------- */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Showreel play ---------- */
  const reelBtn   = document.querySelector('[data-reel-play]');
  const reelVideo = document.querySelector('[data-showreel]');
  if (reelBtn && reelVideo) {
    reelBtn.addEventListener('click', () => {
      if (!reelVideo.querySelector('source') && !reelVideo.src) {
        reelBtn.setAttribute('aria-disabled', 'true');
        reelBtn.querySelector('.reel__play-label').textContent = 'Showreel · à venir';
        return;
      }
      reelVideo.setAttribute('data-played', '');
      reelVideo.muted = false;
      reelVideo.play().catch(() => {});
    });
  }

  /* ---------- Bail out if libs not loaded ---------- */
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  if (reduced || !hasGSAP) {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
    setupCounterFallback();
    setupThemeFallback();
    return;
  }

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (hasLenis && !reduced) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', () => ScrollTrigger.update());
  }

  /* ---------- GSAP setup ---------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Reveals — staggered translateY + fade */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(el,
      { y: 32, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 1, ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => el.classList.add('is-revealed'),
        },
      }
    );
  });

  /* Hero — initial entrance choreography */
  const heroLines = gsap.utils.toArray('#hero [data-reveal]');
  if (heroLines.length) {
    gsap.set(heroLines, { y: 48, opacity: 0 });
    gsap.to(heroLines, {
      y: 0, opacity: 1,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.1,
      onComplete: () => heroLines.forEach((el) => el.classList.add('is-revealed')),
    });
  }

  /* ---------- Theme swap per section ---------- */
  const sections = gsap.utils.toArray('.section[data-section-theme]');
  sections.forEach((sec) => {
    const theme = sec.dataset.sectionTheme;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter:     () => setTheme(theme),
      onEnterBack: () => setTheme(theme),
    });
  });

  function setTheme(t) {
    if (document.body.dataset.theme !== t) {
      document.body.dataset.theme = t;
    }
  }

  /* ---------- Section counter top-right ---------- */
  const counterEl = document.querySelector('[data-counter-current]');
  const numbered  = gsap.utils.toArray('.section[data-section-num]');
  numbered.forEach((sec) => {
    const num = sec.dataset.sectionNum;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 60%',
      end: 'bottom 40%',
      onEnter:     () => updateCounter(num),
      onEnterBack: () => updateCounter(num),
    });
  });

  function updateCounter(n) {
    if (!counterEl || counterEl.textContent === n) return;
    counterEl.textContent = n;
    counterEl.animate(
      [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }

  /* ---------- Counter fallback (no GSAP) ---------- */
  function setupCounterFallback() {
    const el = document.querySelector('[data-counter-current]');
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.target.dataset.sectionNum) {
          el.textContent = e.target.dataset.sectionNum;
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.section[data-section-num]').forEach((s) => io.observe(s));
  }

  /* ---------- Theme fallback (no GSAP) ---------- */
  function setupThemeFallback() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.target.dataset.sectionTheme) {
          document.body.dataset.theme = e.target.dataset.sectionTheme;
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.section[data-section-theme]').forEach((s) => io.observe(s));
  }
})();
