# Quick Reference - GitHub Actions Crawler Deployment

## 🎯 What Changed

| Component | Before | After |
|-----------|--------|-------|
| **Cron Job** | `@nestjs/schedule` in `src/schedule/` | GitHub Actions workflow |
| **Hosting** | Needs persistent process | Stateless (Vercel-ready) |
| **Cost** | ❌ Vercel Hobby can't handle | ✅ FREE ($0/month) |
| **Reliability** | Cold start timeout risk | GitHub infrastructure |
| **Manual Trigger** | Requires API call | One-click in GitHub UI |

## 📝 Files Changed

### ✅ Created (New)
```
.github/workflows/fund-price-crawler.yml    Scheduled crawler workflow
scripts/crawl-fund-price.ts                 Standalone crawler script
vercel.json                                 Vercel deployment config
GITHUB_ACTIONS_SETUP.md                     Complete setup guide
IMPLEMENTATION_SUMMARY.md                   Summary of changes
DEPLOY.sh                                   Deployment script
```

### ✏️ Modified
```
src/app.module.ts                          Removed ScheduleModule
package.json                               Removed @nestjs/schedule
```

### ⚠️ Deprecated (Can Delete)
```
src/schedule/schedule.module.ts
src/schedule/fund-price-crawler.service.ts
src/schedule/repositories/fund-price.repository.ts
```

## 🚀 Deployment Checklist

### Before Anything Else ⚠️
```
[ ] Go to GitHub → Settings → Secrets → Actions
[ ] Click "New repository secret"
[ ] Name: DATABASE_URL
[ ] Value: postgresql://...@neon.tech/nuoilon?sslmode=require
[ ] Click "Add secret"
```

### Push Code
```bash
git add .
git commit -m "feat: migrate to GitHub Actions crawler"
git push
```

### Test Workflow
```
[ ] GitHub → Actions → Fund Price Crawler
[ ] Click "Run workflow" button
[ ] Watch logs execute
[ ] Verify success ✅
```

### Deploy to Vercel (Optional)
```bash
npm run build
vercel --prod
# Add env vars in Vercel dashboard:
# - DATABASE_URL
# - ACTIVE_SECRET  
# - NODE_ENV=production
```

## 📅 Crawler Schedule

| Time (Vietnam) | Time (UTC) | Cron |
|---|---|---|
| 9:15 AM | 2:15 AM | 15 2 * * * |
| 1:15 PM | 6:15 AM | 15 6 * * * |
| 3:15 PM | 8:15 AM | 15 8 * * * |

## 📊 Resource Usage

| Service | Free Tier | Current | Status |
|---------|-----------|---------|--------|
| GitHub Actions | 2,000 min/month | ~180 min/month | ✅ 9% usage |
| NeonDB | 500MB + 10GB/mo | minimal | ✅ Plenty free |
| Vercel Hobby | Unlimited | API only | ✅ Free |
| **Total Cost** | | | **$0/month** |

## 🔍 Verify It Works

### In GitHub UI
1. **Actions tab** → See workflow runs with timestamps
2. **Click run** → See detailed logs
3. **Success indicator**: Logs show ✅ emoji messages

### In Database
```sql
SELECT name, price, "updatedAt" FROM fund_prices 
WHERE name = 'E1VFVN30' 
ORDER BY "updatedAt" DESC 
LIMIT 5;
```

Expected: Recent prices from automated crawler runs

## 🆘 If Something's Wrong

| Problem | Solution |
|---------|----------|
| Workflow never runs | Push a commit to repo (needs activity) |
| Connection refused | Check DATABASE_URL secret is correct |
| Browser timeout | Rare; workflow has 10-min timeout window |
| Price element not found | CafeF HTML changed; update selector |
| Database full | NeonDB free tier: 500MB limit |

## 📞 Support

- **Setup help**: Read [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)
- **Implementation details**: Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Deployment**: Run [DEPLOY.sh](DEPLOY.sh)

## ✨ Key Benefits

✅ **Zero cost** - Uses free tiers only  
✅ **Automatic** - Runs on schedule daily  
✅ **Reliable** - GitHub infrastructure  
✅ **Transparent** - All logs visible in GitHub UI  
✅ **Flexible** - Can manually trigger anytime  
✅ **Scalable** - 2,000 min/month = room to add more crawlers

---

**Status**: ✅ Implementation complete. Ready to add DATABASE_URL secret and deploy!
