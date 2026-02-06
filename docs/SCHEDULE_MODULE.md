# Schedule Module

## Overview
The schedule module runs the fund price crawler as a cron job inside the NestJS application. Use it when you want a long-running instance that only performs scheduled tasks.

## APP_MODE
Set `APP_MODE` in your environment to control which modules load:

- `web` (default): Loads all API modules plus the schedule module.
- `schedule`: Loads only the database and schedule module (no HTTP controllers).

Example:

```
APP_MODE=schedule
```

## Cron Schedule
The crawler runs every 5 minutes:

```
*/5 * * * *
```

## Log Output
Logs are written to a file:

- Path: `logs/fund-price-crawler.log`
- Format: `[TIMESTAMP] [STATUS] Message`

Example line:

```
[2026-02-06T02:15:00.000Z] [SUCCESS] Crawled E1VFVN30 price: 123.45
```

## Playwright Requirements
The crawler uses Playwright Chromium. Ensure Chromium is installed in the runtime environment:

```
npx playwright install --with-deps chromium
```

## Notes
- The GitHub Actions workflow remains available for serverless scheduling.
- Schedule mode requires a long-running process and is not compatible with Vercel serverless functions.
