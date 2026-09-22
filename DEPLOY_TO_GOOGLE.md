# 🚀 Deploying VitalGuard AI to Google Cloud (₹0 Cost / Free Tier)

This guide shows you the fastest, easiest ways to deploy **VitalGuard AI** to Google Cloud with zero setup on your local machine.

---

## 🌟 Method 1: Google Cloud Run via GitHub (Recommended – 100% Free & Automatic)

Google Cloud Run provides:
- **Free Tier:** 2 million requests per month for ₹0.
- **Instant Public HTTPS URL:** (e.g. `https://vitalguard-ai-xxxxx.a.run.app`)
- **Auto-builds Docker container** on Google Cloud servers (no need to install Docker locally).

### Step 1: Push Code to GitHub
1. Go to [github.com](https://github.com) and click **New Repository**.
2. Name it `vitalguard-ai` and click **Create repository** (keep it Public or Private).
3. In your terminal (VS Code / PowerShell inside `d:\project`), run:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/vitalguard-ai.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Google Cloud Run
1. Open [Google Cloud Console](https://console.cloud.google.com/run).
2. Sign in with your Google account. (If you don't have a project yet, click **Select a project** -> **New Project** and name it `vitalguard-ai`).
3. Click **"Create Service"** (or **Deploy Container**).
4. Choose **"Continuously deploy from a repository"** -> click **Set up with Cloud Build**.
5. Select **GitHub** as the provider, authorize your GitHub account, and pick the `vitalguard-ai` repository.
6. Under **Build Configuration**, choose **Dockerfile** (it will automatically find the `Dockerfile` in the root).
7. Under **Authentication**, select **"Allow unauthenticated invocations"** (so your web app is publicly accessible to hackathon judges).
8. Click **Create**!

Google Cloud will build and deploy your app in 2–3 minutes. You will receive a live URL like:
👉 `https://vitalguard-ai-xxxxx.a.run.app`

---

## ⚡ Method 2: Google Cloud Shell (Deploy in 2 Minutes from Browser)

If you don't want to configure GitHub:

1. Open [Google Cloud Shell](https://shell.cloud.google.com) in your browser.
2. Click the **⋮ (More)** menu in Cloud Shell -> **Upload** -> Upload your `project.zip` (or `git clone` your repo).
3. In the Cloud Shell terminal, navigate to the folder:
   ```bash
   cd project
   ```
4. Run this single command:
   ```bash
   gcloud run deploy vitalguard-ai \
     --source . \
     --region us-central1 \
     --allow-unauthenticated
   ```
5. Press `Enter` to confirm. Google Cloud will compile and give you the live URL immediately!

---

## 🚀 Method 3: 1-Click Alternative via Render.com (Easiest for 24h Hackathons)

If you need a live public URL in under 60 seconds without entering any Google Cloud billing:

1. Push your repository to GitHub (Step 1 from Method 1).
2. Go to [render.com](https://render.com) and sign up with GitHub for free.
3. Click **New +** -> **Web Service**.
4. Select your `vitalguard-ai` repository.
5. Render will automatically detect `Python`:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
6. Click **Deploy Web Service**.
7. In ~90 seconds, you get a live public HTTPS URL: `https://vitalguard-ai.onrender.com`!

---

## 📁 Files Included for Deployment

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production container with Gunicorn WSGI server |
| `.dockerignore` | Keeps image lightweight by excluding local cache and logs |
| `app.yaml` | Configuration for Google App Engine |
| `Procfile` | Universal cloud process configuration |
| `requirements.txt` | Production dependencies: `Flask` & `gunicorn` |
