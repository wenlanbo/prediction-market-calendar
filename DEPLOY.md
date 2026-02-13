# Railway Deployment Guide

## Quick Deploy (Recommended)

1. **Click Deploy Button**: Use the Railway button in the README or visit:
   ```
   https://railway.app/new/template?template=https://github.com/wenlanbo/prediction-market-calendar
   ```

2. **Configure**: Railway will clone the repo and set up the project automatically

3. **Domain**: Railway will provide a domain like `prediction-market-calendar.up.railway.app`

## Manual Deploy

1. **Create Railway Account**: https://railway.app

2. **New Project**: 
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `wenlanbo/prediction-market-calendar`

3. **Environment**: Railway auto-detects Node.js and uses the `railway.json` config

4. **Deploy**: Click "Deploy" and wait ~2-3 minutes

## Post-Deployment

- Visit `/calendar.html` for the web view
- Access `/calendar.md` for the agent-readable format
- Hit `/api/refresh` to manually trigger an update
- Check `/api/data` for raw JSON data

## Monitoring

- Railway provides logs in the dashboard
- Check "Deployments" tab for build status
- "Metrics" tab shows resource usage

## Custom Domain

1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Updates

Push to GitHub → Railway auto-deploys!

```bash
git push origin main
```