# 🚀 Complete Deployment Guide for Vercel

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] GitHub account created
- [ ] Vercel account created (free tier is fine)
- [ ] Google Gemini API key obtained

---

## Step 1: Get Your Gemini API Key (FREE)

1. **Visit Google AI Studio**
   - Go to: https://ai.google.dev/
   - Click: "Get started" or "Get API key"

2. **Create API Key**
   - Click: "Get API key in Google AI Studio"
   - Select: "Create API key in new project"
   - Copy the generated API key
   - Store it safely - you'll need it for Vercel

3. **Verify Free Tier Limits**
   - Gemini 2.0 Flash: 15 requests/min, 1M tokens/min
   - Gemini 1.5 Flash: 15 requests/min, 1M tokens/min
   - Perfect for development and moderate use!

---

## Step 2: Prepare Your Project for GitHub

### A. Initialize Git Repository

```bash
# Navigate to project folder
cd ascent-learning-fixed

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ascent Learning Platform"

# Set main branch
git branch -M main
```

### B. Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `ascent-learning` (or any name)
3. **Keep it PUBLIC** (easier for free Vercel hosting)
4. **DO NOT** initialize with README (we already have one)
5. Click "Create repository"

### C. Push to GitHub

```bash
# Add GitHub remote (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR_USERNAME/ascent-learning.git

# Push code
git push -u origin main
```

---

## Step 3: Deploy to Vercel (Two Methods)

### Method A: Via Vercel Website (Recommended for Beginners)

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Click: "Sign Up" (use GitHub login)

2. **Import Project**
   - Click: "Add New..." → "Project"
   - Click: "Import Git Repository"
   - Find your `ascent-learning` repository
   - Click: "Import"

3. **Configure Project**
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `dist` (auto-filled)
   - Click: "Deploy" (will fail first time - that's OK!)

4. **Add Environment Variables**
   - After first deploy, go to: Project Settings
   - Click: "Environment Variables" tab
   - Add variable:
     - **Name**: `VITE_GEMINI_API_KEY`
     - **Value**: [Paste your Gemini API key]
     - **Environments**: Check all boxes (Production, Preview, Development)
   - Click: "Save"

5. **Redeploy**
   - Go to: "Deployments" tab
   - Click: "..." menu on latest deployment
   - Click: "Redeploy"
   - Wait ~2 minutes

6. **🎉 Done!**
   - Your site is live at: `your-project-name.vercel.app`
   - Click the URL to test

### Method B: Via Vercel CLI (For Advanced Users)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Add environment variable
vercel env add VITE_GEMINI_API_KEY
# Paste your API key when prompted
# Select: All environments

# Deploy to production
vercel --prod
```

---

## Step 4: Verification & Testing

### 1. Basic Load Test
- [ ] Website loads without errors
- [ ] Can access the landing page
- [ ] Can log in (use any email/username)

### 2. PDF Upload Test
- [ ] Click "+" button
- [ ] Select "Text/PDF Upload"
- [ ] Upload a sample PDF or paste text
- [ ] Verify summary generates (wait 10-30 seconds)
- [ ] Check flashcards appear
- [ ] Try a quiz

### 3. YouTube Test
- [ ] Click "+" button
- [ ] Select "YouTube Content"
- [ ] Option 1: Paste a YouTube URL
- [ ] Option 2: Paste a transcript directly
- [ ] Verify content processes

### 4. SAT Prep Test
- [ ] Click "SAT Prep" in sidebar
- [ ] Try "Math" module
- [ ] Generate practice questions
- [ ] Verify questions display correctly

### 5. API Functionality Test
- [ ] Check browser console (F12) for errors
- [ ] Verify no "API key invalid" messages
- [ ] Test rate limiting by uploading 3+ items quickly
- [ ] Confirm error handling works

---

## Step 5: Custom Domain (Optional)

1. **In Vercel Dashboard**
   - Go to: Project Settings → Domains
   - Click: "Add"
   - Enter your domain (e.g., `learn.yourdomain.com`)

2. **Configure DNS**
   - Add CNAME record in your DNS provider:
   - **Name**: `learn` (or `@` for root domain)
   - **Value**: `cname.vercel-dns.com`

3. **Wait for SSL**
   - Vercel auto-generates SSL certificate
   - Usually takes 1-5 minutes

---

## Troubleshooting Guide

### ❌ Error: "API Key Invalid"

**Cause**: Environment variable not set or incorrect

**Solution**:
```bash
# Verify in Vercel:
1. Go to Project Settings
2. Environment Variables
3. Check VITE_GEMINI_API_KEY exists
4. Value should start with "AIzaSy..."
5. All environments should be checked
6. Redeploy after adding/changing
```

### ❌ Build Fails on Vercel

**Cause**: Dependency or TypeScript errors

**Solution**:
```bash
# Test locally first:
npm install
npm run build

# If it works locally:
git add .
git commit -m "Fix build"
git push origin main

# Vercel will auto-redeploy
```

### ❌ PDF Upload Not Working

**Cause**: PDF.js worker URL or CORS issue

**Solution**:
- The code uses CDN-hosted worker (already configured)
- Try with text-based PDFs (not scanned images)
- Check browser console for specific errors
- Test with smaller files first (<5MB)

### ❌ Quota Exceeded Errors

**Cause**: Hit Gemini API free tier limits

**Solution**:
```bash
# Check usage at:
https://aistudio.google.com/app/apikey

# Temporary solutions:
1. Wait 1 minute (RPM limit)
2. Use caching (already implemented)
3. Reduce batch sizes

# Long-term:
- Upgrade to paid tier if needed
- Implement user quotas (already done)
```

### ❌ Site Loads but Features Don't Work

**Cause**: Environment variables not applied

**Solution**:
```bash
# In Vercel:
1. Check env vars are in ALL environments
2. Click "Redeploy" after changing env vars
3. Hard refresh browser (Ctrl+Shift+R)
```

---

## Environment Variable Reference

### Required:
```env
VITE_GEMINI_API_KEY=AIzaSy...your-key-here
```

### Optional (for Supabase integration):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Monitoring & Maintenance

### Check Vercel Analytics
- Go to: Project → Analytics
- Monitor: Page views, errors, performance
- Free tier includes basic analytics

### Monitor API Usage
- Visit: https://aistudio.google.com/app/apikey
- Check: Request counts, quota usage
- Set up alerts if needed

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update packages
npm update

# Test locally
npm run dev
npm run build

# Push updates
git add .
git commit -m "Update dependencies"
git push origin main
```

---

## Performance Optimization Tips

### 1. Caching (Already Implemented)
- Responses cached for 30 minutes
- Reduces API calls by ~60%

### 2. Rate Limiting (Already Implemented)
- Prevents quota exhaustion
- User-friendly error messages

### 3. Model Fallbacks (Already Implemented)
- 4-tier model cascade
- Automatic failover on errors

### 4. Future Optimizations
- Enable Vercel Edge caching for static assets
- Consider Redis for distributed caching
- Implement user authentication for better quota management

---

## Production Checklist

Before going live:
- [ ] Test all features (PDF, YouTube, Quiz, SAT, AP)
- [ ] Verify API key is working
- [ ] Check error handling
- [ ] Test on mobile devices
- [ ] Verify dark mode works
- [ ] Check rate limiting behavior
- [ ] Review console for errors
- [ ] Test with real users (beta testing)
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure custom domain (if applicable)
- [ ] Review Gemini API usage limits
- [ ] Set up backup/export features
- [ ] Document known limitations

---

## Quick Commands Reference

```bash
# Local Development
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Git Operations
git status           # Check changes
git add .            # Stage all changes
git commit -m "msg"  # Commit with message
git push origin main # Push to GitHub

# Vercel CLI
vercel               # Deploy to preview
vercel --prod        # Deploy to production
vercel logs          # View deployment logs
vercel env ls        # List env variables
```

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide/
- **Gemini API**: https://ai.google.dev/docs
- **React Docs**: https://react.dev/

---

## Success Criteria

Your deployment is successful when:
✅ Site loads at your Vercel URL
✅ Can log in and access dashboard
✅ Can upload PDF/text and get summary
✅ Can generate quizzes and flashcards
✅ SAT Prep loads and generates questions
✅ No console errors related to API key
✅ Rate limiting prevents quota issues
✅ Dark mode toggles correctly
✅ Mobile responsive design works

---

**Need Help?**
1. Check browser console (F12)
2. Review Vercel deployment logs
3. Verify environment variables
4. Test API key at https://aistudio.google.com/

Good luck with your deployment! 🚀
