# nicolassempere.com — règles projet

Site CV statique pour Nicolas Sempere (motion designer & DA, Bordeaux). Objectif : décrocher un CDI rapidement. Cible : grosses boîtes françaises (scale-ups, fintech, lifestyle premium, agences créatives).

## Workflow git

**Standing rule** — à chaque push de la branche feature courante, enchaîner automatiquement (sans demander confirmation) :

1. `git checkout main`
2. `git merge <feature-branch> --no-ff -m "Merge: ..."`
3. `git push origin main`
4. `git checkout <feature-branch>`

→ Prod (`cv-mu-gules.vercel.app`, à terme `nicolassempere.com`) reste synchro à chaque cycle.

Branche feature actuelle : `claude/setup-repo-check-skills-1kb25`.

## Stack

Statique, **zéro build** :

- **HTML/CSS/JS vanilla**, defer-loaded.
- **Lenis 1.0.42** (smooth scroll) + **GSAP 3.12 / ScrollTrigger** (reveals, theme swap) — tous les trois en CDN.
- Polices via **Fontshare** : `Sentient` (display + body, serif humaniste avec italique), `Switzer` (UI / status pill), `JetBrains Mono` (labels, numéros, mono).
- Tokens CSS : palette `paper #F4F1EC` / `ink #0F0E0C` (off-black, jamais pur) / accent unique `oxblood #B43329` (référence Bordeaux) / dispo `#5C8067` (vert atelier désaturé). Theme `paper` (light) ↔ `ink` (dark) via `body[data-theme]`, swap automatique au scroll.
- Aucune API JS globale exposée. Tout encapsulé dans une IIFE en tête de `script.js`.

Polices interdites : **Inter** (banni par le skill `design-taste-frontend`). Couleurs interdites : pur noir `#000`, purple gradients, glow neon (anti-AI-slop).

## Architecture des sections

7 sections numérotées, ordre verrouillé. Chaque `<section>` porte :

- `id="<slug-en>"` — slug stable pour deep-link et i18n (`#hero`, `#showreel`, `#approche`, `#travail`, `#production`, `#parcours`, `#contact`).
- `data-section-num="0X"` — meta utilisée par les labels éditoriaux et le scroll.
- `data-section-theme="paper|ink"` — déclenche le swap de thème via ScrollTrigger.
- `aria-labelledby="<id>-title"` — a11y.
- `<span class="section__label">` éditorial en marge (`01 — Hero`).

Distribution des thèmes : Hero/Approche/Travail/Parcours en `paper`, Showreel/Production-IA/Contact en `ink`.

**Topbar fixe** : Nom (gauche) · Nav 4 liens (centre) · status pill `● Disponible · CDI` (droite, dot vert pulse).
**Scroll progress bar** : 2px en haut d'écran, remplie en accent oxblood au scroll (élément `[data-progress]`).

## Pixel pet (élément signature)

Petit monstre 8-bit (16×16 grid, sprite SVG inline ~12 KB, 10 frames) **scroll-bound** : sa position est directement liée à la progression du scroll, comme un personnage de Game Boy qui marche sur le bord de la page de bas en haut au rythme de la lecture.

**Architecture** (classe `PixelPet` dans `script.js`) :
- Position : `fixed`, contrôlée via `transform: translate3d(var(--pet-x), var(--pet-y), 0) scaleX(var(--pet-flip))` — JS écrit ces variables CSS chaque frame via `requestAnimationFrame`.
- **Path serpentine** : à chaque frame, calcul de `(x, y) = pathFromProgress(scrollY/max)`.
  - `y` linéaire entre `90px` (sous topbar) et `vh - 60` (bas viewport) — le pet descend visuellement à mesure qu'on scrolle.
  - `x` cosinusoïde 1.5 cycles : `vw/2 + cos(p · 3π) · vw·0.42` — le pet serpente entre les marges droite, centre, gauche, centre, droite.
- **Easing léger** : lerp 0.16 vers la cible chaque frame, pixels arrondis (`Math.round`) pour le rendu tile-based.
- **Walk cycle** : `walk1` ↔ `walk2` swap chaque 8 px parcourus — cadence proportionnelle à la vélocité de scroll. Scroll vite = pet marche vite. Scroll doucement = pet marche doucement.
- **Flip** : `flip = sign(sdy)` où `sdy = scrollY - lastScrollY`. Scroll down → face droite, scroll up → fait demi-tour (sprite flippé).
- **Idle** : après 300 ms sans mouvement, alternance `idle1`/`idle2` toutes les 700 ms (respiration), avec ~12% de chance de `blink` (140 ms) et ~6% de chance de petit hochement de tête (`nodOffset`, sin pulse 280 ms, amplitude 1.6 px).
- Aucun trigger sur sections, aucune téléportation : tout est continu.

**10 frames** : `idle1` / `idle2` / `blink` / `walk1` / `walk2` / `wave` / `jump` / `surprise` / `clap1` / `clap2`. Toutes contrôlées par CSS via `[data-pet-frame="<name>"]`. Les frames `wave`, `jump`, `surprise`, `clap*` ne sont plus utilisées par la logique courante mais restent dans le sprite pour réutilisation ultérieure (animations contextuelles, etc.).

**Couleur** : corps en `currentColor` (s'inverse avec le thème), œil en `var(--accent)`.
**Mobile (< 640px)** : `display: none` (trop petit pour bien lire la pixellisation).
**A11y** : `aria-hidden="true"`, `pointer-events: none`, frame statique `idle1` en `prefers-reduced-motion`.

## Conventions code

- **Variables CSS systématiques** (jamais de valeurs en dur dans les sections — toujours via `var(--token)`).
- Échelle typo via `clamp(min, vw, max)` pour la fluidité — pas de breakpoints durs sur les tailles.
- BEM-light pour les sections : `.section--<name>`, `.<name>__<elem>`. Préfixer chaque section pour éviter les collisions.
- Comments FR, courts, sur le **pourquoi** seulement. Pas de comments qui décrivent le code.
- Reduced-motion (`@media (prefers-reduced-motion: reduce)`) : reveals statiques, animations coupées, scroll natif.
- A11y obligatoire : skip-link, hiérarchie h1→h2→h3, focus visible (outline ember), contrast ≥ 4.5:1, touch targets ≥ 44px.

## Reveals

Tout élément annoté `data-reveal` est animé via GSAP au scroll (translateY 32 → 0 + fade, easing `power3.out`, threshold 88% viewport, déclenché une fois). Hero a une chorégraphie d'entrée séparée (stagger 0.09s, delay 0.1s). Fallback CSS si JS off : `[data-reveal] { opacity: 0; transform: translateY(28px); }` + classe `.is-revealed` qui restore.

## Médias placeholders

Tous les visuels actuels sont des **SVG placeholders** (pellicule / contact-sheet style). Substituer dans `/assets/` :

| Placeholder | Section | Format cible |
|---|---|---|
| `assets/showreel-poster.svg` | 02 | JPG/WebP 1920×1080 |
| (à créer) `assets/showreel.mp4` | 02 | MP4 H.264 1080p ≤ 12 Mo |
| `assets/case-{abf,smartbrain,betclic}.svg` | 04 | JPG/WebP ratio 8:5 (1600×1000) |
| `cv-nicolas-sempere.pdf` | 07 | PDF du vrai CV (placeholder de 587 octets actuellement) |

Calendly : `index.html` → remplacer `https://calendly.com/PLACEHOLDER` par l'URL réelle.

## i18n

FR par défaut (`<html lang="fr">`, `og:locale fr_FR`). Structure prête pour EN sans réarchitecture : ajouter `/en/index.html` quand nécessaire (Vercel route auto). IDs de sections en anglais (`#hero` etc.) pour stabilité des URLs en cross-locale.

## Déploiement

Vercel — connecté au repo `NicoBOi/CV`, branche `main` = production. `vercel.json` à la racine gère cleanUrls + cache 1 an immutable sur assets + headers sécurité (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

Si la prod renvoie 403, vérifier **Vercel → Project Settings → Deployment Protection** (souvent activé par défaut sur Hobby, à désactiver pour exposition publique).

## Skills installées

`.claude/skills/` contient 4 skills design (commit `bf3fdb9`) + 1 skill copywriter pré-existante :

- `caveman` — mode terse pour réponses (token-efficient).
- `frontend-design` (Anthropic) — UI distinctive anti-AI-slop.
- `design-taste-frontend` — règles métriques senior UI/UX (DESIGN_VARIANCE 8, MOTION_INTENSITY 6, VISUAL_DENSITY 4 par défaut).
- `ui-ux-pro-max` — 50+ styles, 161 palettes, 57 font pairings, 99 UX guidelines (priorité 1 : a11y critique).
- `cv-copywriter` — pré-existante, copy CV.

Activation : ces skills se chargent au démarrage de session. Pour qu'elles soient disponibles dans une nouvelle conv, redémarrer la session.
