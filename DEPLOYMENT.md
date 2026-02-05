# GoalFlow - Vercel Deployment Guide

## Step 1: Push Code to GitHub

### If you don't have a GitHub repo yet:

```bash
# Navigate to your project folder
cd goalflow

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repo on GitHub (go to github.com → New Repository → name it "goalflow")
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/goalflow.git
git branch -M main
git push -u origin main
```

---

## Step 2: Sign Up / Log In to Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"** (or Log In)
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub

---

## Step 3: Import Your Project

1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your **goalflow** repository and click **"Import"**
3. Vercel will auto-detect it's a Vite project ✓

---

## Step 4: Configure Environment Variables (IMPORTANT!)

Before deploying, you need to add your Supabase credentials:

1. In the import screen, expand **"Environment Variables"**
2. Add these two variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key-here` |

**Where to find these:**
- Go to your Supabase project dashboard
- Click **Settings** → **API**
- Copy "Project URL" and "anon public" key

---

## Step 5: Deploy

1. Click **"Deploy"**
2. Wait 1-2 minutes for build to complete
3. You'll get a URL like: `https://goalflow-abc123.vercel.app`

🎉 **Done!** Your app is now live and accessible from any device.

---

## Step 6: Update Supabase Settings

Add your new Vercel URL to Supabase's allowed origins:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Site URL**: `https://goalflow-abc123.vercel.app`
3. Add to **Redirect URLs**: `https://goalflow-abc123.vercel.app/**`

---

## Future Deployments

After initial setup, every time you push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel automatically rebuilds and deploys. No action needed!

---

## Optional: Custom Domain

1. In Vercel, go to your project → **Settings** → **Domains**
2. Add your custom domain (e.g., `goalflow.yourdomain.com`)
3. Update DNS records as instructed
4. Update Supabase redirect URLs with new domain

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page after deploy | Check environment variables are set correctly |
| 404 on page refresh | `vercel.json` should handle this (already added) |
| Auth not working | Add Vercel URL to Supabase redirect URLs |
| Build fails | Check build logs in Vercel dashboard |

---

## Quick Reference

| What | Where |
|------|-------|
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://supabase.com/dashboard |
| Your App | https://goalflow-xxx.vercel.app (after deploy) |
