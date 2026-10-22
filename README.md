# Adharsh CS — portfolio

A React + Vite site with a hero intro, a draggable photo archive, project pages and an About page. It uses Framer Motion for animation and Lenis for smooth scrolling.

## Run it

```bash
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build into /dist
```

## Add or change photos

Drop images into `src/photos/` (named `01.jpg`, `02.jpg`, ...). They appear on the hero, the archive, the About page and get their own project page automatically. Resize large photos to about 1400px wide first so the site stays fast.

To give a photo a real title, category, year or note, open `src/data/projects.js` and fill in `OVERRIDES`, using the file name (without extension) as the key.

## Change your details

Name, role, email and social links are all in `src/data/site.js`. Colours, fonts and spacing are at the top of `src/styles.css`.

## Put it on GitHub and Vercel

1. Create an empty repository on GitHub (for example `adharsh-portfolio`).
2. In this folder run:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/adharsh-portfolio.git
   git push -u origin main
   ```
3. On vercel.com choose **Add New → Project**, import the repository, and keep the defaults (Framework: Vite, build command `npm run build`, output `dist`). `vercel.json` already routes every URL to the app so direct links work.
