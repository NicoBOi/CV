# nicolassempere.com

Site CV — Nicolas Sempere. Motion designer & directeur artistique. Bordeaux.

---

## Stack

Statique, **zéro build** : HTML / CSS / JS vanilla.

Libs front (CDN) : GSAP 3.12 + ScrollTrigger, Lenis 1.0 (smooth scroll).
Polices via [Fontshare](https://www.fontshare.com) : **Sentient** (display + body), **Switzer** (UI), **JetBrains Mono** (mono).
Hébergement : Vercel (`vercel.json` à la racine — cleanUrls + cache 1 an immutable + headers sécurité).

Aucune dépendance npm. Aucun bundler. Servir le dossier racine suffit.

---

## Lancer en local

```bash
# Python (présent partout)
python3 -m http.server 8000

# ou Node
npx serve .

# ou Vercel CLI
npx vercel dev
```

Puis ouvrir http://localhost:8000.

> Important : ne pas ouvrir `index.html` en `file://` — les chemins absolus (`/style.css`, `/assets/...`) cassent.

---

## Déploiement Vercel

Repo `NicoBOi/CV` connecté. Push sur `main` = deploy production auto.

Pour brancher le domaine `nicolassempere.com` :
**Vercel → Project → Settings → Domains → Add `nicolassempere.com`**, puis suivre les DNS instructions chez le registrar.

Si la prod renvoie 403 → **Settings → Deployment Protection** (souvent activé par défaut sur Hobby ; à désactiver pour exposition publique).

---

## Architecture

7 sections numérotées, ordre verrouillé :

```
01 — Hero            (paper)   #hero
02 — Showreel        (ink)     #showreel
03 — Approche        (paper)   #approche
04 — Travail         (paper)   #travail   (3 cases : ABF, Smart Brain, Betclic)
05 — Production IA   (ink)     #production
06 — Parcours        (paper)   #parcours
07 — Contact         (ink)     #contact
```

Le thème (paper / ink) bascule automatiquement au scroll via ScrollTrigger.

**Topbar fixe** : Nom (gauche) · Nav 4 liens (centre) · **Status pill `● Disponible · CDI`** dot vert qui pulse (droite).
**Scroll progress bar** : barre fine de 2px en haut d'écran, qui se remplit en accent oxblood à mesure du scroll.

---

## L'élément signature : le pixel pet

Petit monstre 8-bit (16×16 pixels, sprite SVG inline ~12 KB) **scroll-bound** : sa position est directement liée à la progression du scroll, comme un personnage de Game Boy qui marche au rythme de la lecture du visiteur. Il ne saute pas, il ne se téléporte pas — il marche.

### Comportement

- Position calculée chaque frame depuis `window.scrollY / scrollMax` (progression de 0 à 1).
- **Path serpentine** : Y linéaire (haut viewport au début → bas viewport à la fin), X cosinusoïdal 1.5 cycles (droite → centre → gauche → centre → droite). Le pet zigzague à travers la mise en page.
- **Vitesse de marche = vitesse de scroll** : scroll rapide → marche rapide (frame swap fréquent), scroll lent → marche lente.
- **Scroll vers le haut** : le pet fait demi-tour (sprite horizontalement flippé).
- **Scroll arrêté > 300 ms** : passage en idle (respiration alternée 700 ms, clignement aléatoire ~12%, petit hochement de tête ~6%).
- Mouvement avec easing léger (lerp 0.16) pour pas être trop sec, pixels arrondis pour la crispness 8-bit.

### 10 frames disponibles

| Frame | État courant |
|---|---|
| `idle1` / `idle2` | Idle (respiration) |
| `blink` | Idle clignement (140 ms) |
| `walk1` / `walk2` | Marche (cycle = 1 swap toutes les 8 px parcourus) |
| `wave` / `jump` / `surprise` / `clap1` / `clap2` | Réservées (sprite préparé pour usages futurs — animations contextuelles, easter eggs, etc.) |

### Modifier le pet

- **`index.html`** — sprite inline (rechercher `pet__f--idle1`).
- **`script.js`** — classe `PixelPet`, méthodes `pathFromProgress`, `tick`.
- **`style.css`** — bloc `/* PIXEL PET */`, règles `.pet[data-pet-frame="<name>"]`.

Pour changer la trajectoire : éditer `pathFromProgress(p)` dans `script.js`.
Pour changer la vitesse de la marche : éditer le seuil `8` dans `if (this.distAccum >= 8)`.
Pour changer l'easing : éditer `const lerp = 0.16`.
Pour modifier les pixels d'une frame : éditer la grille ASCII dans le commit qui a généré le sprite (script Python, cf. git log) et régénérer.
Pour désactiver totalement : retirer le `<div class="pet">` dans `index.html`.

**Mobile (< 640px)** : caché. **A11y** : `aria-hidden="true"`, `pointer-events: none`, frame statique en `prefers-reduced-motion`.

---

## Où remplacer les médias placeholders

Tous les visuels actuels sont des **SVG placeholders** sobres. À substituer dans `/assets/`.

| Placeholder | Section | Format à fournir |
|---|---|---|
| `assets/showreel-poster.svg` | 02 — Showreel (poster) | JPG ou WebP, 1920×1080, ~150 Ko |
| (à créer) `assets/showreel.mp4` | 02 — Showreel (vidéo) | MP4 H.264, 1080p, ≤ 12 Mo, muet par défaut |
| `assets/case-abf.svg` | 04 — A Better Feeling | JPG/WebP ratio 8:5 (1600×1000) |
| `assets/case-smartbrain.svg` | 04 — Smart Brain | idem |
| `assets/case-betclic.svg` | 04 — Betclic Group | idem |
| `assets/og-image.png` | OG / Twitter | 1200×630, conservé tel quel |
| `assets/favicon.svg` | Favicon | conservé tel quel |

### Pour le showreel vidéo

Dans `index.html`, section 02, décommenter et compléter la balise `<source>` :

```html
<video class="reel__video" poster="/assets/showreel-poster.svg" preload="none" playsinline muted controls data-showreel>
  <source src="/assets/showreel.mp4" type="video/mp4">
</video>
```

Le bouton play se masquera automatiquement quand la vidéo démarrera.

### Pour les visuels de case studies

Remplacer les fichiers `.svg` par des `.jpg` ou `.webp`, puis dans `index.html` mettre à jour les `src=` :

```html
<img src="/assets/case-abf.jpg" alt="A Better Feeling — pub eyewear" loading="lazy" width="1600" height="1000">
```

> **Important** : remplir l'attribut `alt=""` (actuellement vide car les visuels sont décoratifs). Quand un vrai visuel est en place, il faut un `alt` descriptif (1 phrase, contexte du projet).

---

## Brancher Calendly et le CV PDF

### Calendly

`index.html` → section 07 — Contact. Remplacer l'URL placeholder :

```html
<!-- AVANT -->
<a class="cta cta--invert" href="https://calendly.com/PLACEHOLDER" ...>

<!-- APRÈS -->
<a class="cta cta--invert" href="https://calendly.com/nicolassempere/20min" ...>
```

### CV PDF

Le fichier `cv-nicolas-sempere.pdf` à la racine est un placeholder de 587 octets (PDF valide, 1 page).
**Remplacer le fichier** par le vrai CV — le lien `/cv-nicolas-sempere.pdf` continuera de fonctionner.

---

## i18n (anglais — plus tard)

Le site est prêt pour une version anglaise sans réarchitecture. Deux options :

**Option A — duplication** (la plus simple)
Créer `/en/index.html` avec la même structure, copy traduit. Vercel gère le routing automatiquement. Ajouter un sélecteur `FR / EN` dans la topbar.

**Option B — JSON dictionnaire**
Annoter chaque texte avec `data-i18n="key"`, charger un dico JSON, swap au runtime. Recommandé seulement si plusieurs pages.

Pour l'instant, FR par défaut, `<html lang="fr">`, `<meta property="og:locale" content="fr_FR">`. IDs des sections en anglais (`#hero`, `#travail`, etc.) pour stabilité des URLs cross-locale.

---

## Accessibilité

- Skip link vers `#main`
- Hiérarchie h1→h2→h3 propre (h1 unique pour le hero)
- `aria-labelledby` sur chaque `<section>`
- `prefers-reduced-motion` respecté : reveals statiques, animations coupées, pet figé sur idle1, scroll natif
- Focus visible (outline accent oxblood, 2px, offset 3px)
- Contraste ≥ 4.5:1 (vérifié WebAIM)
- Touch targets ≥ 44px sur tous les CTA + nav
- Pet `aria-hidden="true"` (décoratif)

---

## Performance

- Statique → TTFB minimal
- Polices Fontshare via `display=swap`
- GSAP / Lenis chargés en `defer`
- Aucune image bitmap au-dessus du fold
- `loading="lazy"` sur tous les visuels case studies
- Cache 1 an immutable sur tous les assets via `vercel.json`
- Sprite pet inline (~6 KB) — pas de requête supplémentaire

Cible Lighthouse : 100/100/100/100 (avant ajout des vraies vidéos).

---

## Structure du repo

```
.
├── index.html
├── style.css
├── script.js
├── vercel.json
├── cv-nicolas-sempere.pdf       (placeholder — à remplacer)
├── assets/
│   ├── favicon.svg
│   ├── og-image.png
│   ├── grain.svg                (overlay noise — ne pas toucher)
│   ├── showreel-poster.svg      (placeholder)
│   ├── case-abf.svg             (placeholder)
│   ├── case-smartbrain.svg      (placeholder)
│   └── case-betclic.svg         (placeholder)
├── .claude/skills/              (skills Claude Code installées sur ce repo)
├── CLAUDE.md
├── .gitignore
└── README.md
```

---

## Design system (résumé)

**Palette** : `paper #F4F1EC` ↔ `ink #0F0E0C` · accent `oxblood #B43329` · dispo `#5C8067`
**Typo** : Sentient (display + body) · Switzer (UI) · JetBrains Mono (numéros, labels)
**Motion** : Lenis smooth scroll · GSAP reveals (translateY 24 → 0, fade, threshold 88%) · theme swap au scroll · `prefers-reduced-motion` strictly respected

---

## Contact

Email : nicosmp.pro@gmail.com
GitHub : [@NicoBOi](https://github.com/NicoBOi)
