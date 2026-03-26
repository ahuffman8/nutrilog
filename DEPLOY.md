# Deploying NutriLog to Koyeb

## Prerequisites

- [Koyeb account](https://app.koyeb.com)
- GitHub repository with this code pushed to it
- Anthropic API key

## Step 1 — Push to GitHub

```bash
cd ~/nutrilog
git init
git add .
git commit -m "initial commit"
gh repo create nutrilog --private --source=. --push
```

## Step 2 — Create a PostgreSQL database

In the Koyeb console:

1. Go to **Databases** → **Create Database Service**
2. Choose the free **Hobby** tier
3. Name it `nutrilog-db`
4. Select the region closest to you
5. Click **Create**
6. Once provisioned, copy the **Connection String** (starts with `postgres://`)

## Step 3 — Deploy the app

In the Koyeb console:

1. Go to **Apps** → **Create App**
2. Select **GitHub** as the deployment method
3. Connect your GitHub account and select the `nutrilog` repository
4. Set the **Branch** to `main`
5. Under **Build and deployment**:
   - **Build command**: `npm install && npm run build`
   - **Run command**: `npm start`
   - **Port**: `3000`
6. Under **Environment variables**, add:
   - `DATABASE_URL` → paste the PostgreSQL connection string from Step 2
   - `ANTHROPIC_API_KEY` → your Anthropic API key
   - `NODE_ENV` → `production`
7. Click **Deploy**

## Step 4 — Verify the deployment

1. Wait for the build to complete (2–4 minutes)
2. Click the public URL Koyeb provides (e.g., `https://nutrilog-xxx.koyeb.app`)
3. You should see the NutriLog onboarding screen
4. Complete onboarding — the app will initialize the PostgreSQL schema automatically on first request

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (production) | PostgreSQL connection string from Koyeb Databases |
| `ANTHROPIC_API_KEY` | Yes | API key from [console.anthropic.com](https://console.anthropic.com) |
| `NODE_ENV` | Recommended | Set to `production` |
| `PORT` | No | Koyeb sets this automatically; Next.js reads it |

## Local development (no changes needed)

Without `DATABASE_URL` set, the app automatically uses a local SQLite file (`nutrilog.db` in the project root). No configuration required.

```bash
npm run dev
```

## Updating the deployment

Push to the `main` branch — Koyeb automatically rebuilds and redeploys.

```bash
git add .
git commit -m "your changes"
git push
```
