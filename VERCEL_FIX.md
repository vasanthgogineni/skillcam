# Vercel Serverless Function Fix

## Problem
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/routes'
```

This happens because Vercel can't resolve the relative import `../server/routes` in `api/index.ts`.

## Solution

The issue is that Vercel needs to include both `server` and `shared` directories. Update your `vercel.json`:

```json
{
  "version": 2,
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist/public",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "api/index.ts": {
      "includeFiles": "server/**",
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

## Alternative Solution (if above doesn't work)

If the `includeFiles` isn't working, try creating a `vercel.json` in the `api` directory:

**Create `api/vercel.json`:**
```json
{
  "functions": {
    "index.ts": {
      "includeFiles": "../server/**"
    }
  }
}
```

## If Still Not Working

1. **Check that all files are committed to Git** - Vercel only deploys committed files
2. **Make sure `server` and `shared` directories exist** in your repo
3. **Try using absolute imports** instead of relative:

In `api/index.ts`, change:
```typescript
import { registerRoutes } from "../server/routes";
```

To use the `@shared` path alias (if configured):
```typescript
// This might not work, but try if relative imports fail
```

## Quick Fix Steps

1. Commit all changes (including `server/` and `shared/` directories)
2. Push to GitHub
3. Redeploy on Vercel
4. Check the build logs to see if files are being included

## Verify Files Are Included

Check Vercel build logs - you should see:
```
Including files: server/** in function api/index.ts
```

If you don't see this, the `includeFiles` isn't working and you may need to use a different approach.


