# 🚀 Quick Start Guide

## Setup in 5 Minutes

### 1. Get Your API Key (1 min)
```bash
1. Visit: https://ai.google.dev/
2. Click: "Get API key"
3. Create new project
4. Copy the API key (starts with "AIza...")
```

### 2. Configure Environment (1 min)
```bash
# Copy example file
cp .env.example .env

# Edit .env and add your key:
VITE_GEMINI_API_KEY=your_api_key_here
```

### 3. Install & Run (2 mins)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to: http://localhost:3000
```

### 4. Test Features (1 min)
- Click "+" to add content
- Upload a PDF or paste text
- Try YouTube URL or transcript
- Generate quiz and flashcards
- Test SAT/AP prep sections

## Deploy to Vercel (Bonus 5 mins)

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# Then on Vercel:
1. Import GitHub repo
2. Add env var: VITE_GEMINI_API_KEY
3. Deploy
```

Full deployment guide: See [DEPLOYMENT.md](DEPLOYMENT.md)

## Troubleshooting

**Build fails?**
```bash
npm run build  # Test locally first
```

**API errors?**
- Check .env file has correct key
- Verify key at: https://aistudio.google.com/

**PDF upload fails?**
- Use text-based PDFs (not scans)
- Try smaller files first

## Features to Test

✅ PDF text extraction
✅ YouTube content synthesis  
✅ AI summary generation
✅ Flashcard creation
✅ Quiz generation  
✅ SAT Math & Reading prep
✅ AP course materials
✅ Study timer & planner
✅ Dark mode

## Get Help

- Full README: [README.md](README.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Run tests: `./test.sh`

---

**Ready in 5 minutes! 🎓**
