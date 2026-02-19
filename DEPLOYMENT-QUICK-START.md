# Ascent Learning - Deployment Quick Start

## Build & Deploy

The platform builds successfully with:

```bash
npm install
npm run build
```

### Netlify

1. Connect your repo in Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variable: `VITE_OPENROUTER_API_KEY` (your OpenRouter API key)
5. Deploy

### Vercel

1. Import your repo in Vercel
2. Vercel auto-detects Vite (build/output)
3. Add environment variable: `VITE_OPENROUTER_API_KEY` (your OpenRouter API key)
4. Deploy

## Required Environment Variable

**VITE_OPENROUTER_API_KEY** - Your OpenRouter API key for DeepSeek R1 (free tier)

- Get your key: https://openrouter.ai/keys
- Set in Netlify/Vercel: Project Settings → Environment Variables
- **Important**: Redeploy after adding or changing env vars

## Fixed Issues (v3.0)

- ✅ PDF parsing: Uses bundled worker to eliminate version mismatch errors
- ✅ Strategic Planner: Correctly generates weekly study plans and converts to calendar events
- ✅ Build: ES2022 target for pdfjs-dist compatibility
- ✅ Import paths: Fixed component resolution for Vite builds
