/* ════════════════════════════════════════════════════════════════════
   Nicolas Sempere — Portfolio JS
   Vanilla ES module. Zero dependencies. Designed for < 5 KB gzipped.
   ════════════════════════════════════════════════════════════════════ */

const TYPING_SPEED  = 35;    // ms per character
const LINE_GAP      = 600;   // ms between lines
const FINAL_PAUSE   = 1500;  // ms before screen clears
const CLEAR_FADE    = 400;   // ms for fade-out of the 6 lines

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* Mark JS-enabled so CSS can hide pre-rendered content for animation */
document.documentElement.classList.add('js');

/* ─── Stagger via CSS custom property ─────────────────────────────── */
document.querySelectorAll('[data-stagger]').forEach((el) => {
  el.style.setProperty('--stagger', el.dataset.stagger);
});

/* ─── Fade-in on scroll (IntersectionObserver) ────────────────────── */
const fadeTargets = document.querySelectorAll('.fade-in');

if (reducedMotion.matches) {
  /* Reduced-motion: reveal everything immediately, no observer. */
  fadeTargets.forEach((el) => el.classList.add('is-visible'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    }
  );
  fadeTargets.forEach((el) => io.observe(el));
}

/* ─── Lazy-load videos when they approach the viewport ────────────── */
const videos = document.querySelectorAll('video[data-src]');

const attachVideo = (video) => {
  if (video.dataset.loaded) return;
  video.dataset.loaded = '1';
  const src = video.dataset.src;
  if (!src) return;
  /* Build <source> so we can extend formats later if needed */
  const source = document.createElement('source');
  source.src = src;
  source.type = 'video/mp4';
  video.appendChild(source);
  video.load();
  /* Try autoplay only after data is attached, respecting reduced-motion */
  if (!reducedMotion.matches) {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => { /* autoplay blocked — poster will remain */ });
    }
  }
};

if (videos.length) {
  if (reducedMotion.matches) {
    /* Reduced-motion users still see posters; videos won't autoplay.
       Attach src on user activation so they can press play if desired. */
    videos.forEach((v) => {
      v.controls = true;
      v.removeAttribute('loop');
    });
  } else {
    const videoIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            attachVideo(entry.target);
            videoIO.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    videos.forEach((v) => videoIO.observe(v));
  }
}

/* ─── Hero typewriter ─────────────────────────────────────────────── */
const heroLines    = document.querySelectorAll('[data-typewriter] .hero__line');
const heroQuestion = document.querySelector('[data-typewriter-final]');
const heroList     = document.querySelector('[data-typewriter]');

const buildCursor = () => {
  const c = document.createElement('span');
  c.className = 'typed-cursor';
  c.setAttribute('aria-hidden', 'true');
  return c;
};

const typeInto = async (el, text) => {
  /* Replace original textContent with empty span + cursor */
  const typed = document.createElement('span');
  typed.className = 'typed-text';
  el.replaceChildren(typed);
  const cursor = buildCursor();
  el.appendChild(cursor);
  el.classList.add('is-typing');
  /* Make element visible (CSS hides it by default when JS is loaded) */
  el.style.visibility = 'visible';

  for (const char of text) {
    typed.appendChild(document.createTextNode(char));
    await sleep(TYPING_SPEED);
  }

  el.classList.remove('is-typing');
  el.classList.add('is-typed');
  /* Detach cursor from this line so it can move on; caller re-attaches if needed */
  cursor.remove();
};

const runHeroTypewriter = async () => {
  if (reducedMotion.matches) return; /* CSS handles the fallback */
  if (!heroLines.length || !heroQuestion) return;

  /* Cache original strings, then clear DOM nodes */
  const lineTexts = Array.from(heroLines).map((el) => el.textContent.trim());
  const questionText = heroQuestion.textContent.trim();
  heroLines.forEach((el) => { el.textContent = ''; });
  heroQuestion.textContent = '';

  /* Type each line in sequence */
  for (let i = 0; i < heroLines.length; i++) {
    await typeInto(heroLines[i], lineTexts[i]);
    if (i < heroLines.length - 1) {
      /* Move cursor to start of next line for visual continuity */
      const nextLine = heroLines[i + 1];
      nextLine.style.visibility = 'visible';
      nextLine.appendChild(buildCursor());
      await sleep(LINE_GAP);
      /* Remove the placeholder cursor from next line — typeInto adds its own */
      const placeholder = nextLine.querySelector('.typed-cursor');
      if (placeholder) placeholder.remove();
    }
  }

  /* Hold the screen on "Un stratège." for the dramatic pause */
  await sleep(FINAL_PAUSE);

  /* Fade out the 6 lines */
  heroList.classList.add('is-clearing');
  await sleep(CLEAR_FADE);
  heroList.style.display = 'none';

  /* Type the final question */
  await typeInto(heroQuestion, questionText);

  /* Persist a blinking cursor at the end of the question forever */
  heroQuestion.appendChild(buildCursor());
};

/* Kick off after first paint to avoid blocking render */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(runHeroTypewriter);
  }, { once: true });
} else {
  requestAnimationFrame(runHeroTypewriter);
}
