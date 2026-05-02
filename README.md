# nicolassempere.com

Site CV — Nicolas Sempere. Motion designer & directeur artistique. Bordeaux.

---

## Stack

Statique, sans build : **HTML / CSS / JS vanilla**.
Libs front (CDN) : GSAP 3.12 + ScrollTrigger, Lenis 1.0 (smooth scroll).
Polices : Boska + Switzer + JetBrains Mono via [Fontshare](https://www.fontshare.com).
Hébergement : Vercel (déploiement direct, zero config — `vercel.json` inclus pour cache & headers).

Le site est intégralement statique. Aucune dépendance npm, aucun bundler. Servir le dossier racine suffit.

---

## Lancer en local

N'importe quel serveur statique fait l'affaire :

```bash
# Python (présent partout)
python3 -m http.server 8000

# ou Node (npx, pas d'install)
npx serve .

# ou Vercel CLI (preview locale)
npx vercel dev
```

Puis ouvrir http://localhost:8000.

> Important : les chemins commencent par `/` (ex. `/style.css`). Ne pas ouvrir `index.html` en `file://`, certains liens casseront.

---

## Déploiement Vercel

```bash
# Première fois
npx vercel       # preview
npx vercel --prod  # production
```

Ou simplement connecter le repo GitHub `NicoBOi/CV` à Vercel : push sur `main` = deploy auto.

Le `vercel.json` à la racine gère :
- `cleanUrls: true` (URLs propres)
- Cache long (1 an, immutable) pour `*.css|js|svg|png|webp|woff2|pdf`
- Headers sécurité (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)

Pour brancher le domaine `nicolassempere.com` : Vercel → Project → Settings → Domains.

---

## Où remplacer les médias placeholders

Tous les visuels actuels sont des **SVG placeholders** intentionnellement neutres. À substituer dans `/assets/`.

| Placeholder | Section | Format à fournir |
|---|---|---|
| `assets/showreel-poster.svg` | 02 — Showreel (poster) | JPG ou WebP, 1920×1080, ~150 Ko |
| (à créer) `assets/showreel.mp4` | 02 — Showreel (vidéo) | MP4 H.264, 1080p, ≤ 12 Mo, muet par défaut |
| `assets/case-smartbrain.svg` | 04 — Case 1 | JPG/WebP, ratio 4:3 (1200×900), ou WebM bouclé |
| `assets/case-betclic.svg` | 04 — Case 2 | idem |
| `assets/case-freelance.svg` | 04 — Case 3 | idem |
| `assets/og-image.png` | OG / Twitter | 1200×630, conservé tel quel |
| `assets/favicon.svg` | Favicon | conservé tel quel |

### Pour le showreel vidéo

Dans `index.html`, section 02, décommenter et compléter la balise `<source>` :

```html
<video class="reel__video" poster="/assets/showreel-poster.svg" preload="none" playsinline muted controls data-showreel>
  <source src="/assets/showreel.mp4" type="video/mp4">
</video>
```

### Pour les visuels de case studies

Remplacer les fichiers `.svg` par des `.jpg` ou `.webp`, puis dans `index.html` mettre à jour les `src=` :

```html
<img src="/assets/case-smartbrain.jpg" alt="Smart Brain — show scénique" loading="lazy" width="1200" height="900">
```

> **À ne pas oublier** : remplir `alt=""` (actuellement vide car les visuels sont décoratifs). Quand un vrai visuel est mis, il faut un `alt` descriptif (1 phrase, contexte du projet).

---

## Brancher Calendly et le CV PDF

### Calendly

Dans `index.html`, section 07 — Contact, remplacer l'URL placeholder :

```html
<!-- AVANT -->
<a class="cta cta--primary cta--invert" href="https://calendly.com/PLACEHOLDER" ...>

<!-- APRÈS -->
<a class="cta cta--primary cta--invert" href="https://calendly.com/nicolassempere/20min" ...>
```

### CV PDF

Le fichier `cv-nicolas-sempere.pdf` à la racine est un placeholder de 587 octets (PDF valide, 1 page).
**Remplacer le fichier** par le vrai CV — le lien `/cv-nicolas-sempere.pdf` continuera de fonctionner.

---

## Architecture du contenu

7 sections numérotées, ordre verrouillé :

```
01 — Hero            (paper)   #hero
02 — Showreel        (ink)     #showreel
03 — Approche        (paper)   #approche
04 — Études de cas   (paper)   #cases
05 — Production IA   (ink)     #production
06 — Parcours        (paper)   #parcours
07 — Contact         (ink)     #contact
```

Le thème (paper / ink) bascule automatiquement au scroll via ScrollTrigger.

---

## i18n (anglais — plus tard)

Le site est prêt pour une version anglaise sans réarchitecture. Deux options recommandées :

**Option A — duplication** (la plus simple)
Créer `/en/index.html` avec la même structure. Vercel gère le routing automatiquement.
Ajouter un sélecteur de langue dans la topbar (`FR / EN`).

**Option B — JSON dictionnaire** (plus tard, si beaucoup de pages)
Annoter chaque texte avec `data-i18n="key"`, charger un dico JSON, swap au runtime.

Pour l'instant, FR par défaut, `<html lang="fr">`, `<meta property="og:locale" content="fr_FR">`.

---

## Accessibilité

- Skip link vers `#main`
- Hiérarchie de titres correcte (h1 unique, h2 par section, h3 sub)
- `aria-labelledby` sur chaque `<section>`
- `prefers-reduced-motion` respecté : toutes les animations GSAP/Lenis sont désactivées, les reveals sont rendus statiques, le `pulse` du dot disponibilité est coupé
- Focus visible (outline ember 2px)
- Contrast ratio ≥ 4.5:1 sur tous les textes (vérifié avec WebAIM Contrast Checker)
- Touch targets ≥ 44px (CTA, nav)

---

## Performance

- Statique → TTFB minimal
- Polices via Fontshare CDN (`display=swap`)
- GSAP/Lenis chargés en `defer`
- Aucune image bitmap au-dessus du fold (hero = type only)
- `loading="lazy"` sur tous les visuels de case studies
- Cache 1 an immutable sur tous les assets

Cible Lighthouse : 100 / 100 / 100 / 100 (avant ajout des vidéos).

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
│   ├── case-smartbrain.svg      (placeholder)
│   ├── case-betclic.svg         (placeholder)
│   └── case-freelance.svg       (placeholder)
├── .claude/skills/              (skills Claude Code installées sur ce repo)
├── .gitignore
└── README.md
```

---

## Contact

Email : nicosmp.pro@gmail.com
GitHub : [@NicoBOi](https://github.com/NicoBOi)
