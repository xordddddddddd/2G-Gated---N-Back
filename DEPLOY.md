# Your app is NOT on commit `256f6c5`

That commit is a **blank Vercel template**. It does not exist in this GitHub repo.

Your real app is on **`main`** (see latest commit on GitHub).

---

## Use GitHub Pages (recommended — works in 2 steps)

### Step 1 — Enable Pages

Open: **https://github.com/xordddddddddd/2G-Gated---N-Back/settings/pages**

| Setting | Value |
|---------|--------|
| Source | **Deploy from a branch** |
| Branch | **gh-pages** |
| Folder | **/ (root)** |

Click **Save**.

### Step 2 — Wait for deploy workflow

1. Open: **https://github.com/xordddddddddd/2G-Gated---N-Back/actions**
2. Wait for **"Deploy to GitHub Pages"** to finish (green check)
3. If it didn't run, click it → **Run workflow**

### Your live URL

**https://xordddddddddd.github.io/2G-Gated---N-Back/**

You should see **"2G Quad N-Back"** with Home + Settings tabs.

---

## Why Vercel stays on `256f6c5`

Your Vercel project was created from **vercel.com/new** as an empty template. It is **not** pulling code from this GitHub repository — even if Git looks connected, it may be linked to a different repo Vercel created.

### Fix Vercel (only if you want Vercel specifically)

1. **Delete** the current Vercel project entirely
2. Re-import using this exact link:

   **https://vercel.com/new/clone?repository-url=https://github.com/xordddddddddd/2G-Gated---N-Back**

3. Confirm the first deployment shows commit **`a261871`** or newer — NOT `256f6c5`

Do **not** use "Redeploy" on old deployments.

---

## Verify the correct version

| Old (wrong) | New (correct) |
|-------------|---------------|
| 3-second countdown | Starts immediately |
| Cards below grid | Grid with A/F/J/L keys around it |
| No Settings tab | Home + Settings tabs |
| Commit `256f6c5` | Commit `a261871`+ |

Build hash on home screen should show **`va261871`** or newer.
