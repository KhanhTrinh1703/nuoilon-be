# GitHub Actions Fund Price Crawler - Setup Guide

## Implementation Complete ✅

The Vercel + GitHub Actions deployment plan has been implemented. Here's what was created and changed:

### New Files Created

1. **`scripts/crawl-fund-price.ts`** - Standalone crawler script
   - No NestJS dependencies
   - Uses TypeORM DataSource for database connection
   - Supports both cloud (NeonDB) and local database modes
   - Includes detailed logging with emoji indicators
   - Proper error handling and browser cleanup

2. **`.github/workflows/fund-price-crawler.yml`** - GitHub Actions workflow
   - Scheduled to run at 2:15 AM, 6:15 AM, 8:15 AM UTC (= 9:15 AM, 1:15 PM, 3:15 PM Vietnam time)
   - Can be manually triggered via "Run workflow" button
   - Installs Node.js, dependencies, and Playwright
   - Runs crawler script with `DATABASE_URL` environment variable
   - Timeout: 10 minutes (plenty for crawler operation)

3. **`vercel.json`** - Vercel deployment configuration
   - Configured for NestJS output (`dist/main.js`)
   - Serverless function routing setup

### Files Modified

1. **`src/app.module.ts`**
   - Removed `ScheduleModule` import
   - Removed `ScheduleModule` from imports array

2. **`package.json`**
   - Removed `@nestjs/schedule` dependency
   - Kept `playwright` (required for GitHub Actions workflow)

### Schedule Module Deprecation

The following files are now unused:
- `src/schedule/schedule.module.ts` (can be deleted)
- `src/schedule/fund-price-crawler.service.ts` (replaced by `scripts/crawl-fund-price.ts`)
- `src/schedule/repositories/fund-price.repository.ts` (repository logic moved to script)

## Next Steps to Complete Deployment

### Step 1: Add Repository Secret

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add secret with name: `DATABASE_URL`
4. Set value to your NeonDB connection string:
   ```
   postgresql://user:password@host.neon.tech/nuoilon?sslmode=require
   ```

⚠️ **Critical**: This step is required for the workflow to work. Without `DATABASE_URL`, the crawler will fail to connect to the database.

### Step 2: Push Changes to GitHub

```bash
git add .
git commit -m "feat: migrate to GitHub Actions crawler for Vercel deployment"
git push
```

### Step 3: Test the Workflow

1. Go to GitHub → **Actions** tab
2. Select **"Fund Price Crawler"** workflow
3. Click **"Run workflow"** button
4. Monitor logs as the job executes

**Expected behavior:**
- ✅ Dependencies install
- ✅ Playwright chromium downloads
- ✅ Browser launches and navigates to CafeF
- ✅ Price element loads
- ✅ Price value extracted and database updated
- ✅ Browser closed gracefully

### Step 4: Verify Database Update

After successful workflow run, check that the `fund_prices` table has been updated with the latest price for `E1VFVN30`.

### Step 5: Deploy API to Vercel (Optional)

When ready to deploy the API to Vercel:

```bash
npm run build
vercel --prod
```

Then in Vercel dashboard, add environment variables:
- `DATABASE_URL` - NeonDB connection string
- `ACTIVE_SECRET` - HMAC signing secret
- `NODE_ENV` - Set to `production`

## How It Works

### Daily Schedule
```
GitHub Actions Workflow Runs:
├── 2:15 AM UTC = 9:15 AM Vietnam (Morning crawl)
├── 6:15 AM UTC = 1:15 PM Vietnam (Afternoon crawl)
└── 8:15 AM UTC = 3:15 PM Vietnam (Evening crawl)
```

### Crawler Flow
1. GitHub Actions runner starts Ubuntu container
2. Checks out code from repository
3. Installs Node.js 20 + npm dependencies
4. Downloads Playwright Chromium browser
5. Runs `scripts/crawl-fund-price.ts`:
   - Connects to NeonDB via `DATABASE_URL` secret
   - Launches headless Chromium browser
   - Navigates to CafeF fund price page
   - Waits for price element to load
   - Extracts price value
   - Updates or creates record in `fund_prices` table
   - Closes browser and database connection
6. Logs all steps to GitHub Actions output

### Benefits Over NestJS Schedule

| Aspect | NestJS Schedule | GitHub Actions |
|--------|-----------------|----------------|
| **Cost** | Requires hosting (Vercel Hobby won't work) | FREE (2,000 min/month free) |
| **Scalability** | Limited by process memory | Scales infinitely |
| **Reliability** | Cold start timeout risk | GitHub infrastructure |
| **Logs** | In application logs | GitHub Actions UI |
| **Manual Trigger** | Hard to trigger | One-click in GitHub UI |
| **Monitoring** | Requires external tools | Built-in GitHub Actions |

## Troubleshooting

### Workflow fails to run on schedule

**Solution**: Workflows need at least one commit on the branch. If no activity for 60 days, workflows pause automatically. Push a commit or manually trigger to resume.

### "DATABASE_URL secret not set"

**Solution**: Go to **Settings** → **Secrets and variables** → **Actions** and add the `DATABASE_URL` secret.

### Browser launch timeout

**Solution**: Rare, but if GitHub runner is overloaded, runner might timeout. Workflow has 10-minute timeout window, which is plenty.

### Connection refused to database

**Solution**: 
1. Verify `DATABASE_URL` is correct (test it locally first)
2. Ensure NeonDB allows connections from GitHub Actions (no IP whitelist)
3. Check database has 500MB free space (NeonDB free tier limit)

### Price element not found

**Solution**: CafeF website might have changed HTML structure. Update the selector in `scripts/crawl-fund-price.ts` line 48 (`#real-time__price`).

## Monitoring

### View Workflow Runs
- **GitHub** → **Actions** → **Fund Price Crawler** tab
- See all runs with timestamps and durations

### View Logs
- Click on specific workflow run
- Expand **"Run crawler"** step to see detailed output

### Common Success Indicators
```
✅ Database connected
✅ Browser launched
📍 Navigating to https://cafef.vn/...
⏳ Waiting for price element...
💰 Crawled price: 26.15
✏️  Price updated in database
✅ Crawl completed successfully
🔌 Browser closed
🔌 Database connection closed
```

## File Structure

```
nuoilon-be/
├── .github/
│   └── workflows/
│       └── fund-price-crawler.yml         (NEW: GitHub Actions workflow)
├── scripts/
│   └── crawl-fund-price.ts               (NEW: Standalone crawler script)
├── src/
│   ├── app.module.ts                     (MODIFIED: Removed ScheduleModule)
│   ├── database/
│   │   └── entities/
│   │       └── fund-price.entity.ts      (Used by crawler)
│   └── schedule/                         (DEPRECATED: Can be deleted)
│       ├── fund-price-crawler.service.ts
│       ├── repositories/
│       │   └── fund-price.repository.ts
│       └── schedule.module.ts
├── package.json                          (MODIFIED: Removed @nestjs/schedule)
└── vercel.json                           (NEW: Vercel configuration)
```

## Optional: Cleanup

After verifying the workflow runs successfully, you can delete the deprecated schedule module:

```bash
# Delete the schedule module folder
rm -r src/schedule/

# Then rebuild to ensure no imports remain
npm run build
```

## Security Notes

- `DATABASE_URL` secret is encrypted by GitHub
- Workflow runs on GitHub's secure infrastructure
- No secrets appear in logs
- Browser runs in headless mode (no GUI exposure)
- Consider adding Slack/Discord notification on failure (see workflow comment)

---

**Deployment ready!** The API is now prepared for Vercel, and the crawler will run reliably via GitHub Actions.
