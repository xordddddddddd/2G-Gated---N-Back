# Fix Vercel showing `256f6c5` Initial commit

If your Vercel deployment shows:

> **256f6c5** — Initial commit — Created from https://vercel.com/new

your Vercel project is **not deploying from this GitHub repo**. That commit is a blank Vercel scaffold, not your app.

Your real app is on GitHub `main` (currently `235e667` or newer).

## Fix (5 minutes)

### Step 1 — Open project settings

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your **2G-Gated---N-Back** project
3. Click **Settings** → **Git**

### Step 2 — Connect the correct repository

If no repo is connected, or it shows the wrong repo:

1. Click **Connect Git Repository**
2. Choose **GitHub** → authorize if needed
3. Select: **`xordddddddddd/2G-Gated---N-Back`**
4. Set **Production Branch** to **`main`**

### Step 3 — Deploy latest `main`

1. Go to **Deployments**
2. Click **Create Deployment** (top right)
3. Branch: **`main`**
4. Confirm the commit is **`235e667`** or newer (NOT `256f6c5`)
5. Click **Deploy**

### Step 4 — Verify

Open your live URL. On the **Home** tab you should see:

- **Home** and **Settings** tabs at the top
- **Quad Training** title
- Black game screen with grid + A/F/J/L keys when you press Start
- Build hash **`v235e667`** (or newer) at the bottom of the home card

---

## Alternative: delete and re-import

1. Delete the current Vercel project
2. Open: https://vercel.com/new/clone?repository-url=https://github.com/xordddddddddd/2G-Gated---N-Back
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

---

## Alternative: GitHub Pages (no Vercel)

1. Open https://github.com/xordddddddddd/2G-Gated---N-Back/settings/pages
2. Source: **GitHub Actions**
3. After the next push to `main`, the app will be at:

   **https://xordddddddddd.github.io/2G-Gated---N-Back/**
