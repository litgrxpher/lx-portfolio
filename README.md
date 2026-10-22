# Adharsh CS — portfolio

A React + Vite site: a hero intro, a draggable archive that mixes every photo at random, a page for each series (place or topic) and an About page. It uses Framer Motion for animation and Lenis for smooth scrolling.

## Run it

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build into /dist
```

## Add a new series (a place or topic)

1. Make a folder inside `src/series/`. The number at the start sets the order, for example `03-munnar`.
2. Put the photos in it (`01.jpg`, `02.jpg`, ...). Resize big photos to about 1400px wide first.
3. Optional: add videos (`clip.mp4`, `.webm`). They do not appear in the archive (that keeps it smooth). On the series page they play in their original shape, looping and muted by default, with a Sound on/off button. Keep them compressed (a few MB each).
4. Add an `info.json` in the same folder:

```json
{
  "title": "Munnar",
  "location": "Kerala, India",
  "date": "August 2026",
  "category": "Travel",
  "description": "A few lines about the place and the trip.",
  "details": { "Camera": "iPhone 15 Pro", "Weather": "Mist and light rain" },
  "captions": { "01.jpg": "First light on the tea hills" }
}
```

Every field is optional and anything you leave empty is simply hidden. `details` can hold any extra labels you like. Save, and the series appears in the archive, mixed in at random with the others. Clicking any of its photos opens that series' page.

## Change your details

Name, email and social links are in `src/data/site.js`. Colours, fonts and spacing are at the top of `src/styles.css`.

## Put it on GitHub and Vercel

```bash
git add -A
git commit -m "Update portfolio"
git push
```

On vercel.com choose Add New, then Project, import the repository and keep the defaults (Framework: Vite, build command `npm run build`, output `dist`). Every later `git push` redeploys the site. `vercel.json` already routes every URL to the app so direct links work.
