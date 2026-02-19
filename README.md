# 🚀 Ascent Learning Platform - DEPLOYMENT GUIDE

##  3 SIMPLE STEPS TO GET LIVE

### STEP 1: Get API Key (2 min)
1. https://openrouter.ai/ → Sign Up
2. https://openrouter.ai/keys → Create Key
3. Copy key (starts with `sk-or-v1-...`)

### STEP 2: Push to GitHub (3 min)
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ascent-learning.git
git push -u origin main
```

### STEP 3: Deploy to Vercel (1 min)
1. https://vercel.com → Sign up with GitHub
2. Import `ascent-learning` repo
3. Add environment variable:
   - Name: `VITE_OPENROUTER_API_KEY`
   - Value: Your API key from Step 1
4. Click Deploy

**DONE! Site is LIVE!** 🎉

---

## ✅ What You Get

- Elite College Board-level content
- Free AI (DeepSeek R1)
- Free hosting (Vercel/Netlify)
- SAT & AP prep materials
- PDF upload & AI summaries

---

## 🐛 Troubleshooting

**"API Key is missing"**
→ Add `VITE_OPENROUTER_API_KEY` in Vercel environment variables

**"Invalid API key"**  
→ Check key at openrouter.ai/keys, copy again

**"Failed to parse PDF"**
→ Use text-based PDFs (not scanned images)

---

## 📞 Links

- API Keys: https://openrouter.ai/keys
- Vercel: https://vercel.com
- GitHub: https://github.com

---

**Total Setup Time: 6 minutes** ⚡
**Your educational platform is production-ready!** 🎓
