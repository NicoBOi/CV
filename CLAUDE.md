# sempere.studio — règles projet

## Workflow git

**Standing rule** : à chaque fois que je push la branche feature `claude/install-anthropic-skills-RD1Iq`, j'enchaîne automatiquement :
1. `git checkout main`
2. `git merge <feature> --no-ff -m "Merge ..."`
3. `git push origin main`
4. `git checkout <feature>`

→ Prod (`cv-mu-gules.vercel.app`) reste synchro avec feature à chaque cycle. Pas besoin de demander confirmation.

## Stack

- HTML/CSS/JS pur, defer-loaded.
- Lenis (smooth) + GSAP/ScrollTrigger (anims).
- Inter Display variable via rsms.me.
- Tokens CSS (palette charbon/crème/terracotta `#c8512a`, échelle typo sculptée xs→6xl, easings `cinematic`/`iris`/`snap`).
- API JS : `window.__cinematic.{lenis,gsap,ScrollTrigger,eases,setTheme}`.

## Conventions code

- Variables CSS systématiques (jamais de valeurs en dur).
- Comments FR, courts.
- Une scène = un IIFE en fin de `script.js`.
- Une scène = `<section data-scene>` + classes `.scene-<name>__*` BEM-light.
- Reduced-motion : fallback statique pour chaque scène.
