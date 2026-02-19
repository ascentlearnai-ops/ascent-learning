# ✅ Vercel Deployment Checklist - No 404 Errors

Follow this checklist to deploy successfully without any 404 errors.

## Pre-Deployment Checklist

### ☑️ Local Setup
- [ ] Extract the zip file: `ascent-learning-fixed.zip`
- [ ] Navigate to folder: `cd ascent-learning-fixed`
- [ ] Verify vercel.json exists: `ls vercel.json` ✓
- [ ] Create .env file: `cp .env.example .env`
- [ ] Add API key to .env: `VITE_GEMINI_API_KEY=your_key_here`

### ☑️ Test Locally (Important!)
```bash
# 1. Install dependencies
npm install

# 2. Test development server
npm run dev
# Visit: http://localhost:3000
# Test: Navigate to different pages, refresh browser

# 3. Test production build
npm run build
npm run preview
# Visit: http://localhost:3000
# Test: Navigate, refresh, use browser back/forward
```

### ☑️ Git Setup
```bash
# 1. Initialize git (if not already)
git init

# 2. Verify vercel.json is included
git add .
git status
# Should see: vercel.json in list

# 3. Commit
git commit -m "Initial commit - Ascent Learning"

# 4. Set main branch
git branch -M main
```

## GitHub Setup

### ☑️ Create Repository
- [ ] Go to: https://github.com/new
- [ ] Repository name: `ascent-learning` (or your choice)
- [ ] Visibility: Public (required for free Vercel)
- [ ] **DO NOT** initialize with README
- [ ] Click: "Create repository"

### ☑️ Push Code
```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/ascent-learning.git

# Push code
git push -u origin main

# Verify on GitHub
# Go to your repo URL
# Should see all files including vercel.json ✓
```

## Vercel Deployment

### ☑️ Initial Setup
- [ ] Go to: https://vercel.com
- [ ] Sign up/login (use GitHub login)
- [ ] Click: "Add New..." → "Project"
- [ ] Click: "Import Git Repository"
- [ ] Find: Your `ascent-learning` repository
- [ ] Click: "Import"

### ☑️ Project Configuration
**Framework Preset**
- [ ] Should auto-detect: "Vite"
- [ ] If not, select "Vite" from dropdown

**Root Directory**
- [ ] Leave as: `./` (root)
- [ ] **DO NOT** change this

**Build Settings**
- [ ] Build Command: `npm run build` (auto-filled)
- [ ] Output Directory: `dist` (auto-filled)
- [ ] Install Command: `npm install` (auto-filled)

### ☑️ Environment Variables
**Before deploying, add:**
- [ ] Click: "Environment Variables" section
- [ ] Variable name: `VITE_GEMINI_API_KEY`
- [ ] Value: Your Gemini API key (from https://ai.google.dev/)
- [ ] Environments: Check ALL boxes
  - [x] Production
  - [x] Preview  
  - [x] Development
- [ ] Click: "Add"

### ☑️ Deploy
- [ ] Click: "Deploy" button
- [ ] Wait 2-3 minutes for build
- [ ] **First deployment might fail** - that's OK!

### ☑️ Fix First Deploy (If Failed)
If you see errors:
```bash
# 1. Check build logs in Vercel dashboard
# 2. Common fix: Redeploy after adding env vars

# In Vercel dashboard:
# - Go to "Deployments" tab
# - Click "..." on latest deployment
# - Click "Redeploy"
```

## Post-Deployment Testing

### ☑️ Critical Tests
Visit your deployed site: `your-project.vercel.app`

**Test 1: Homepage**
- [ ] Visit: `yoursite.vercel.app`
- [ ] Should load landing page ✓
- [ ] No errors in browser console (F12)

**Test 2: Navigation**
- [ ] Click through all menu items
- [ ] Dashboard loads ✓
- [ ] SAT Prep loads ✓
- [ ] AP Center loads ✓

**Test 3: Refresh (Critical!)**
- [ ] Navigate to: `/dashboard`
- [ ] Press F5 (refresh)
- [ ] **Should NOT get 404** ✓
- [ ] Page should reload correctly

**Test 4: Direct URLs**
- [ ] Open new tab
- [ ] Type: `yoursite.vercel.app/sat-prep`
- [ ] Should load directly (not 404) ✓

**Test 5: Browser Navigation**
- [ ] Click through pages
- [ ] Use browser back button ✓
- [ ] Use browser forward button ✓
- [ ] All should work smoothly

**Test 6: Upload Feature**
- [ ] Click "+" button
- [ ] Try uploading text or PDF
- [ ] Should process without errors ✓
- [ ] Check for API key errors

### ☑️ 404 Error Debug
If you see 404 errors after deployment:

**Check 1: vercel.json Deployed**
```bash
# In your browser:
# Visit: yoursite.vercel.app/vercel.json
# Should show JSON content (or 404 - that's OK)

# The important check:
# In Vercel dashboard → Settings → General
# Look for "Rewrites" - should show your configuration
```

**Check 2: Vercel Detected It**
- [ ] Go to Vercel project settings
- [ ] Click "General" tab
- [ ] Scroll to "Framework Preset"
- [ ] Should say "Vite" ✓

**Check 3: Correct Build Output**
- [ ] Go to latest deployment
- [ ] Check "Build Logs"
- [ ] Look for: "Build completed"
- [ ] Look for: "Output Directory: dist"

**Fix: Force Redeploy**
```bash
# If still issues, trigger new deployment:
git commit --allow-empty -m "Fix: Force redeploy"
git push origin main

# Or in Vercel dashboard:
# Deployments → ... → Redeploy
```

## Verification Commands

Run these to verify everything is correct:

```bash
# 1. Check vercel.json exists in root
ls -la vercel.json
# Should output: vercel.json

# 2. Check vercel.json content
cat vercel.json
# Should show rewrites configuration

# 3. Check git tracking
git ls-files | grep vercel.json
# Should output: vercel.json

# 4. Check environment file setup
cat .env.example
# Should show VITE_GEMINI_API_KEY template
```

## Common Issues & Fixes

### Issue 1: 404 on All Routes
**Cause**: vercel.json not deployed
**Fix**: 
```bash
git add vercel.json
git commit -m "Add vercel.json"
git push origin main
```

### Issue 2: 404 Only on Refresh
**Cause**: Vercel not detecting SPA configuration
**Fix**:
- Verify vercel.json in root directory
- Redeploy via Vercel dashboard
- Clear Vercel build cache

### Issue 3: API Key Errors
**Cause**: Environment variable not set
**Fix**:
- Vercel Settings → Environment Variables
- Add: VITE_GEMINI_API_KEY
- Value: Your API key
- Check all environment boxes
- Redeploy

### Issue 4: Build Fails
**Cause**: Missing dependencies or TypeScript errors
**Fix**:
```bash
# Test locally first
npm install
npm run build

# If succeeds locally:
git push origin main
# Let Vercel rebuild
```

### Issue 5: Routes Work Locally but Not on Vercel
**Cause**: Local dev server handles routing differently
**Fix**:
```bash
# Test production build locally
npm run build
npm run preview

# Should mimic Vercel behavior
# If works locally but not Vercel, check vercel.json
```

## Success Indicators

✅ **Deployment is successful when:**
1. Homepage loads without errors
2. Can navigate to all pages (Dashboard, SAT, AP, etc.)
3. Refreshing any page doesn't cause 404
4. Direct URL access works (e.g., sharing links)
5. Browser back/forward buttons work
6. Can upload files and generate content
7. No console errors (except possibly warnings)
8. API calls succeed (summaries, quizzes generate)

## Final Verification

Before going live:
- [ ] Test on desktop browser
- [ ] Test on mobile browser
- [ ] Test in incognito/private mode
- [ ] Share link with friend to test
- [ ] Try all major features:
  - [ ] PDF upload
  - [ ] YouTube content
  - [ ] Quiz generation
  - [ ] SAT prep
  - [ ] AP center
  - [ ] Dark mode toggle

## Deployment Complete! 🎉

If all checkboxes are marked:
✅ Your site is live
✅ No 404 errors
✅ All features working
✅ Ready for users

**Your URL**: `your-project.vercel.app`

### Next Steps:
1. Share your URL
2. Monitor usage (Vercel Analytics)
3. Check API quota (https://aistudio.google.com/)
4. Consider custom domain (optional)

## Quick Reference

**Redeploy Command:**
```bash
git commit --allow-empty -m "Redeploy"
git push origin main
```

**Check Deployment Status:**
- Vercel Dashboard → Deployments
- Look for: "Ready" status ✓

**Environment Variables:**
- Settings → Environment Variables
- VITE_GEMINI_API_KEY should be visible

**Build Logs:**
- Click any deployment
- View "Build Logs" tab

---

**Need Help?**
- See: VERCEL-404-FIX.md (detailed troubleshooting)
- See: DEPLOYMENT.md (full deployment guide)
- See: QUICKSTART.md (quick setup)

**Everything is configured correctly in your project - just follow the checklist!** ✨
