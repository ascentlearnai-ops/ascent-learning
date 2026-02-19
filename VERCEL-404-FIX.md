# 🔧 Vercel 404 Error Fix Guide

## Problem: 404 NOT_FOUND Error on Vercel

If you're seeing a 404 error after deploying to Vercel (especially when refreshing pages or navigating directly to routes), this is because Vercel doesn't know how to handle client-side routing.

## ✅ Solution: vercel.json Configuration

Your project already includes the correct `vercel.json` file. Here's what it does:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This tells Vercel: "For ANY route, serve index.html and let React handle the routing."

## 🚀 How to Fix if Still Getting 404

### Step 1: Verify vercel.json Exists
```bash
# Check if file exists in your project root
ls -la vercel.json

# Should see: vercel.json
```

### Step 2: Ensure File is in Git
```bash
# Check if vercel.json is tracked
git status

# If not tracked, add it:
git add vercel.json
git commit -m "Add vercel.json for SPA routing"
git push origin main
```

### Step 3: Redeploy on Vercel
- Go to Vercel dashboard
- Click your project
- Go to "Deployments" tab
- Click "..." menu on latest deployment
- Click "Redeploy"

OR trigger automatic redeploy:
```bash
# Make a small change
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

## 🔍 Why This Happens

### Without vercel.json:
1. User visits: `yoursite.com/dashboard`
2. Vercel looks for file: `/dashboard` or `/dashboard.html`
3. File doesn't exist → 404 Error ❌

### With vercel.json:
1. User visits: `yoursite.com/dashboard`
2. Vercel sees rewrite rule
3. Serves: `/index.html`
4. React Router handles: `/dashboard` route
5. Correct page loads ✅

## 📋 Verification Checklist

After deploying, test these scenarios:

- [ ] Visit homepage: `yoursite.com`
- [ ] Click through app navigation
- [ ] Refresh page on different routes
- [ ] Direct URL access: `yoursite.com/sat-prep`
- [ ] Direct URL access: `yoursite.com/ap-center`
- [ ] Browser back/forward buttons
- [ ] Bookmarked URLs

All should work without 404 errors!

## 🛠️ Alternative Configurations

### Option 1: Simple (Recommended - Already in your project)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option 2: With Build Settings (If auto-detection fails)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Option 3: Explicit Routes (More control)
```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/dashboard", "destination": "/index.html" },
    { "source": "/sat-prep", "destination": "/index.html" },
    { "source": "/ap-center", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 🐛 Still Getting 404?

### Check 1: File Location
```bash
# vercel.json MUST be in project root
project-root/
├── vercel.json          ✅ Correct
├── package.json
├── index.html
└── components/
    └── vercel.json      ❌ Wrong location
```

### Check 2: File Syntax
```bash
# Validate JSON syntax
cat vercel.json | jq .

# Should show formatted JSON without errors
```

### Check 3: Vercel Build Logs
1. Go to Vercel project
2. Click "Deployments"
3. Click latest deployment
4. Check "Build Logs"
5. Look for errors or warnings

### Check 4: Clear Vercel Cache
```bash
# In Vercel dashboard:
Settings → General → Clear Build Cache
Then redeploy
```

## 💡 Common Mistakes

❌ **Wrong**: Putting vercel.json in `src/` folder
✅ **Correct**: Put vercel.json in root folder

❌ **Wrong**: Using `routes` instead of `rewrites`
✅ **Correct**: Use `rewrites` for SPA routing

❌ **Wrong**: Not committing vercel.json to git
✅ **Correct**: Commit and push vercel.json

❌ **Wrong**: Deploying before pushing vercel.json
✅ **Correct**: Push vercel.json first, then deploy

## 🎯 Quick Fix Commands

If you're still having issues, run these:

```bash
# 1. Ensure vercel.json is in root
pwd  # Should show project root
ls vercel.json  # Should exist

# 2. Add to git
git add vercel.json
git commit -m "Fix: Add vercel.json for SPA routing"

# 3. Push to GitHub
git push origin main

# 4. Wait for auto-deploy or manually trigger
# Vercel will auto-deploy when you push to main
```

## ✅ Success Indicators

You've fixed it when:
1. ✅ Can refresh any page without 404
2. ✅ Direct URLs work (e.g., sharing `yoursite.com/dashboard`)
3. ✅ Browser back/forward buttons work
4. ✅ No "NOT_FOUND" errors in Vercel deployment

## 📞 Still Stuck?

Check these in order:
1. Verify vercel.json is in project root
2. Check file is committed to git: `git ls-files vercel.json`
3. View Vercel build logs for errors
4. Check Vercel project settings for correct root directory
5. Try deploying from a fresh git clone

## 🔗 Resources

- Vercel SPA Routing: https://vercel.com/docs/concepts/projects/project-configuration#rewrites
- Vite + Vercel: https://vitejs.dev/guide/static-deploy.html#vercel
- React Router + Vercel: https://reactrouter.com/en/main/guides/deploying#vercel

---

**Your project already has the correct vercel.json - just make sure it's committed and deployed!**
