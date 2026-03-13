import { Flashcard, QuizQuestion } from "../types";
import { generationRateLimiter, chatSpamLimiter, dailyChatLimiter, getTierLimits } from "../utils/security";
import axios from 'axios';

// Model selection — Dual Setup
const MODELS = {
  primary: "stepfun/step-3.5-flash:free",          // summaries, lessons, strategic planner, chat
  json: "arcee-ai/trinity-large-preview:free",         // Trinity for quizzes, flashcards, SAT/AP questions
  fallback: "meta-llama/llama-3.3-70b-instruct:free"    // Real fallback when StepFun is unavailable
};

// Start with primary, but allow override
let currentModel = MODELS.primary;

// Keys are now securely managed on the backend proxy

// ── Helper: Extract JSON from messy AI output ──
const extractJSON = (text: string): string => {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const arrStart = cleaned.indexOf('[');
  const objStart = cleaned.indexOf('{');
  let start = -1;
  if (arrStart >= 0 && objStart >= 0) start = Math.min(arrStart, objStart);
  else if (arrStart >= 0) start = arrStart;
  else if (objStart >= 0) start = objStart;
  if (start > 0) cleaned = cleaned.substring(start);
  return cleaned;
};

// Response cache for optimization
const responseCache = new Map<string, any>();
const CACHE_TTL = 1000 * 60 * 60; // 60 minutes - optimized for faster repeat queries

interface CacheEntry {
  data: any;
  timestamp: number;
}

const getCacheKey = (type: string, content: string = "") => {
  let hash = 0;
  const safeContent = String(content || "");
  const str = safeContent.substring(0, 1000);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${type}_${hash}`;
};

const getCachedResponse = (key: string): any | null => {
  const entry = responseCache.get(key) as CacheEntry;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    console.log("⚡ Cache hit:", key);
    return entry.data;
  }
  if (entry) {
    responseCache.delete(key);
  }
  return null;
};

const setCachedResponse = (key: string, data: any) => {
  responseCache.set(key, { data, timestamp: Date.now() } as CacheEntry);
  if (responseCache.size > 100) {
    const oldestKey = Array.from(responseCache.keys())[0];
    responseCache.delete(oldestKey);
  }
};

// Call OpenRouter API
const callDeepSeek = async (
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4000,
  attemptFallback: boolean = true
): Promise<string> => {
  const safeMaxTokens = Math.min(maxTokens, 8000);

  // Production: Use deployed backend proxy
  const speedOptimizedMessages = messages.map(m => ({
    ...m,
    content: m.content.length > 15000
      ? m.content.substring(0, 15000) + "\n[Content trimmed for speed]"
      : m.content
  }));

  try {
    const response = await axios.post(
      "/api/generate",
      {
        model: currentModel,
        messages: speedOptimizedMessages,
        temperature: temperature,
        max_tokens: safeMaxTokens,
      },
      { timeout: 60000 } // 60 second hard timeout — prevents infinite hangs
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      console.log(`✓ Generated with OpenRouter (${currentModel})`);
      return response.data.choices[0].message.content;
    } else {
      throw new Error("Empty response from AI generation.");
    }
  } catch (error: any) {
    const errorText = error.response?.data?.error?.message || error.response?.data?.error || error.message || "";
    console.error(`OpenRouter API Error with ${currentModel}:`, errorText);

    if (attemptFallback && currentModel === MODELS.primary) {
      console.log("Primary model failed, trying fallback model...");
      currentModel = MODELS.fallback;
      return await callDeepSeek(messages, temperature, maxTokens, false);
    }

    let userMessage = "AI generation failed. ";
    if (typeof errorText === 'string') {
      if (errorText.includes("Invalid key") || errorText.includes("401")) {
        userMessage = "Invalid API key. Please check your variables.";
      } else if (errorText.includes("429") || errorText.includes("quota")) {
        userMessage = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (errorText.includes("timeout") || error.code === 'ECONNABORTED') {
        userMessage = "Generation timed out. Please try again.";
      } else {
        userMessage = `API error: ${errorText}`;
      }
    } else {
      userMessage = `API error: ${JSON.stringify(errorText)}`;
    }
    throw new Error(userMessage);
  }
};

// JSON-output caller — uses StepFun with explicit JSON prompting for quizzes, flashcards, questions
const callJsonModel = async (
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4000
): Promise<string> => {
  // Replace any existing system message with JSON-focused one
  const jsonMessages = [
    {
      role: 'system',
      content: 'You are a JSON-only output machine. You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanations, no text before or after. Start your response directly with [ or {.'
    },
    ...messages.filter(m => m.role !== 'system').map((m, i, arr) => {
      if (i === arr.length - 1 && m.role === 'user') {
        return {
          ...m,
          content: m.content + "\n\nRESPOND WITH RAW JSON ONLY. No markdown. No ```json. Start directly with [ or {."
        };
      }
      return m;
    })
  ];

  try {
    const response = await axios.post(
      "/api/generate",
      {
        model: MODELS.json,
        messages: jsonMessages,
        temperature: 0.3,
        max_tokens: Math.min(maxTokens, 8000),
      },
      { timeout: 120000 } // 2 min timeout for large sets
    );
    if (response.data?.choices?.length > 0) {
      const raw = response.data.choices[0].message.content;
      console.log(`✓ JSON generated with StepFun (${MODELS.json})`);
      return extractJSON(raw);
    }
    throw new Error("Empty response from JSON generation.");
  } catch (error: any) {
    console.error("JSON generation failed:", error.message);
    // Fallback: try callDeepSeek with JSON instructions embedded in user message
    console.log("Attempting fallback via callDeepSeek with JSON instructions...");
    const fallbackMessages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        return { ...m, content: m.content + "\n\nYou MUST output ONLY valid JSON. No markdown, no code fences. Start with [ or {." };
      }
      return m;
    });
    const fallbackResult = await callDeepSeek(fallbackMessages, 0.3, maxTokens, false);
    return extractJSON(fallbackResult);
  }
};

// Parse AI JSON responses
const parseAIResponse = (text: string | undefined): any => {
  if (!text) return [];
  try {
    const cleanText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Find JSON array or object
    const jsonMatch = cleanText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      // Fix potential unescaped control characters in JSON string
      const sanitized = jsonMatch[0].replace(/[\u0000-\u001F]+/g, "");
      try {
        return JSON.parse(sanitized);
      } catch (e) {
        // Attempt to fix truncated JSON by closing brackets
        let fixed = sanitized;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;

        // Try to find last complete object and close the array
        if (openBrackets > closeBrackets) {
          // Find the last complete object (ending with })
          const lastCompleteObj = fixed.lastIndexOf('}');
          if (lastCompleteObj > 0) {
            fixed = fixed.substring(0, lastCompleteObj + 1);
            // Remove trailing comma if present
            fixed = fixed.replace(/,\s*$/, '');
            // Close remaining brackets
            for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
            try {
              return JSON.parse(fixed);
            } catch (e2) {
              console.warn("Truncated JSON fix attempt failed");
            }
          }
        }
        console.warn("Regex json parsing failed, trying raw...");
      }
    }

    return JSON.parse(cleanText.replace(/[\u0000-\u001F]+/g, ""));
  } catch (e) {
    const errorPreview = text ? String(text).substring(0, 200) : "undefined";
    console.error("JSON Parse Error:", e, "Text:", errorPreview);
    return [];
  }
};

// Clean HTML responses
const cleanHtml = (text: string | undefined): string => {
  if (!text) return "";
  let cleaned = text
    .replace(/```html\n?/gi, '')
    .replace(/```xml\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  // Strip any text before the first HTML tag
  const firstTagIndex = cleaned.indexOf('<');
  if (firstTagIndex > 0) {
    cleaned = cleaned.substring(firstTagIndex);
  }

  // Also strip trailing non-HTML after last closing tag
  const lastTagIndex = cleaned.lastIndexOf('>');
  if (lastTagIndex > 0 && lastTagIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastTagIndex + 1);
  }

  return cleaned;
};

// Smart generation with retry logic
const smartGenerate = async <T>(
  generateFn: () => Promise<T>,
  cacheKey?: string
): Promise<T> => {
  // Check cache first
  if (cacheKey) {
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) return cached;
  }

  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Rate limiting check
      if (!generationRateLimiter.check()) {
        await new Promise(r => setTimeout(r, 1000));
      }

      console.log(`🤖 Using Aurora Alpha (attempt ${attempt + 1})`);

      const result = await generateFn();

      // Cache successful result
      if (cacheKey && result) {
        setCachedResponse(cacheKey, result);
      }

      return result;

    } catch (error: any) {
      console.warn(`Attempt ${attempt + 1} failed:`, error.message);

      const errorMsg = error.message?.toLowerCase() || '';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit');
      const isAuthError = errorMsg.includes('api key') || errorMsg.includes('401') || errorMsg.includes('403');

      // Fatal errors
      if (isAuthError) {
        throw new Error("Invalid API Key. Please check your OpenRouter API key.");
      }

      // Retry with exponential backoff on rate limits
      if (isRateLimit && attempt < maxAttempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`⏳ Rate limited, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Last attempt or unrecoverable error
      if (attempt === maxAttempts - 1) {
        throw new Error(
          isRateLimit
            ? "API rate limit exceeded. Please try again in a few moments."
            : `Generation failed: ${error.message}`
        );
      }
    }
  }

  throw new Error("Generation failed after all retries");
};

// Check if input is short topic vs full content
const isShortOrUrl = (text: string) => text.trim().length < 300 || text.startsWith('http');

// Multi-proxy fetch for better reliability
const fetchWithFallback = async (url: string) => {
  const encUrl = encodeURIComponent(url);
  const proxies = [
    `https://api.allorigins.win/raw?url=${encUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${encUrl}`,
    `https://corsproxy.io/?${encUrl}`
  ];
  let lastError;
  for (const proxy of proxies) {
    try {
      const resp = await fetch(proxy, { headers: { 'Accept': 'text/html' } });
      if (resp.ok) {
        const text = await resp.text();
        return text;
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("All proxies failed to fetch");
};

// Image Generation using free Pollinations.ai API (no API key required, unlimited limits)
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    // Generate a random seed so duplicate prompts don't get the cached image
    const seed = Math.floor(Math.random() * 1000000);
    // Pollinations generates images instantly strictly via URL encoding
    const encodedPrompt = encodeURIComponent(`Clean, precise, minimalist educational diagram on a white background: ${prompt}`);

    // Using the free pollinations.ai image API which has exceptionally high limits and is completely free
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

    return imageUrl;
  } catch (err) {
    console.error("Image generation error:", err);
    return "";
  }
};

// Extract YouTube video ID from any URL format
const extractVideoId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {}
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// Parse YouTube XML transcript into plain text
const parseTranscriptXml = (xml: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const nodes = doc.getElementsByTagName('text');
  let out = '';
  for (let i = 0; i < nodes.length; i++) {
    const t = nodes[i].textContent || '';
    out += t.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>') + ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
};

export const synthesizeVideoContent = async (url: string): Promise<string> => {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL. Please paste a valid youtube.com or youtu.be link.");

  // ── Tier 1: Direct timedtext JSON API (fastest, no page scraping needed) ──
  try {
    const timedtextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3`;
    const data = await fetchWithFallback(timedtextUrl);
    const json = JSON.parse(data);
    if (json?.events?.length > 0) {
      const transcript = json.events
        .filter((e: any) => e.segs)
        .flatMap((e: any) => e.segs.map((s: any) => (s.utf8 || '').replace(/\n/g, ' ')))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (transcript.length > 200) {
        console.log(`✓ Tier 1 transcript: ${transcript.length} chars`);
        return transcript;
      }
    }
  } catch (e) {
    console.warn('Tier 1 (timedtext JSON) failed:', e);
  }

  // ── Tier 2: Page scrape → extract caption tracks → fetch XML ──
  try {
    const html = await fetchWithFallback(`https://www.youtube.com/watch?v=${videoId}`);

    // More robust regex — captures the full captionTracks array
    const tracksMatch = html.match(/"captionTracks":(\[.*?\])/s);
    if (tracksMatch) {
      const tracks: any[] = JSON.parse(tracksMatch[1]);
      const englishTrack = tracks.find(t => t.languageCode === 'en' || t.name?.simpleText?.toLowerCase().includes('english')) || tracks[0];

      if (englishTrack?.baseUrl) {
        const xml = await fetchWithFallback(englishTrack.baseUrl);
        const transcript = parseTranscriptXml(xml);
        if (transcript.length > 200) {
          console.log(`✓ Tier 2 transcript: ${transcript.length} chars`);
          return transcript;
        }
      }
    }

    // Also try to extract video title + description for Tier 3 fallback
    const titleMatch = html.match(/"title":"([^"]+)"/);
    const descMatch = html.match(/"shortDescription":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';
    const desc = descMatch ? descMatch[1].substring(0, 500) : '';

    if (title) {
      console.warn('No transcript found — falling back to AI synthesis from metadata');
      return `VIDEO_METADATA_FALLBACK: Title: ${title}. Description: ${desc}. VideoID: ${videoId}`;
    }
  } catch (e) {
    console.warn('Tier 2 (page scrape) failed:', e);
  }

  // ── Tier 3: oEmbed metadata (always works, no CORS issues) ──
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(oembedUrl);
    if (resp.ok) {
      const data = await resp.json();
      const title = data.title || 'Unknown Video';
      const author = data.author_name || '';
      console.warn('Using oEmbed metadata fallback for:', title);
      return `VIDEO_METADATA_FALLBACK: Title: "${title}" by ${author}. VideoID: ${videoId}`;
    }
  } catch (e) {
    console.warn('Tier 3 (oEmbed) failed:', e);
  }

  throw new Error("Could not retrieve transcript for this video. It may have captions disabled. Try pasting the video content as text instead.");
};

export const generateSummary = async (text: string): Promise<string> => {
  if (!text) return "";

  // Handle YouTube metadata fallback — no transcript, so generate notes from video title
  const isMetadataFallback = text.startsWith('VIDEO_METADATA_FALLBACK:');
  if (isMetadataFallback) {
    const metaInfo = text.replace('VIDEO_METADATA_FALLBACK:', '').trim();
    const metaCacheKey = getCacheKey('summary_meta', text);
    const metaPrompt = `A student wants to study a YouTube video: ${metaInfo}

Generate comprehensive study notes for this video topic as if you are a knowledgeable tutor. Use 8th-grade vocabulary. Cover the main concepts that would be discussed based on the title. Target: 600-1000 words. Use the same HTML structure with <h2> sections and <span class=\"interactive-term\" data-def=\"...\"> for key vocabulary.`;
    return smartGenerate(async () => {
      const response = await callDeepSeek([{ role: 'user', content: metaPrompt }], 0.3, 2500);
      return cleanHtml(response) || '<h2>Error generating notes</h2>';
    }, metaCacheKey);
  }

  const cacheKey = getCacheKey('summary', text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async () => {
    const wordCount = text.split(/\s+/).length;

    let targetWords: string;
    let termCount: string;
    let maxTokens: number;

    if (wordCount < 1000) {
      targetWords = '400–600 words';
      termCount = '8–12 key terms';
      maxTokens = 1500;
    } else if (wordCount < 5000) {
      targetWords = '600–900 words';
      termCount = '15–25 key terms';
      maxTokens = 2500;
    } else if (wordCount < 10000) {
      targetWords = '800–1200 words';
      termCount = '25–40 key terms';
      maxTokens = 3500;
    } else {
      targetWords = '1000–1500 words';
      termCount = '35–50 key terms';
      maxTokens = 4000;
    }

    const contextPrompt = isTopic
      ? `Generate expert study notes on: "${text}"`
      : `Analyze this source material:\n\n${text.substring(0, 50000)}`;

    const prompt = `${contextPrompt}

Create the ULTIMATE study summary. Target length: ${targetWords}.

WRITING RULES (non-negotiable):
- Use 8th-grade vocabulary for ALL explanations — write like you're explaining to a smart middle schooler
- Still include ALL advanced terms and concepts — just explain them simply
- Explain WHY things matter, not just WHAT happened
- Use cause-and-effect thinking throughout

KEY VOCABULARY (${termCount}):
Wrap every important term like this:
<span class="interactive-term" data-def="simple 10-word definition here">Term</span>
Definitions must be in plain language a 13-year-old would understand instantly.

HTML STRUCTURE (no markdown):
<h2>Big Ideas</h2>
<p>2-3 sentence overview in simple language</p>

<h2>[Main Topic 1]</h2>
<p>Explanation using simple words. Cause → Effect. Why it matters.</p>

<h2>[Main Topic 2]</h2>
...

<h2>Key Vocabulary</h2>
<ul>
  <li><strong>TERM:</strong> Simple definition</li>
</ul>

<h2>Why This Matters</h2>
<p>Big picture significance in plain language</p>

FORMATTING:
- Use <h2> for main sections, <h3> for sub-points
- Bold terms on first use: <strong>term</strong>
- Use <ul><li> for lists
- Keep paragraphs short (3-5 sentences max)
- NO filler phrases like "it is important to note"

Output ONLY HTML starting with <h2>.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.25, maxTokens);

    return cleanHtml(response) || "<h2>Error generating summary</h2>";
  }, cacheKey);
};

export const generateFlashcards = async (text: string, count: number = 8): Promise<Flashcard[]> => {
  const cacheKey = getCacheKey(`flashcards_${count}`, text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async () => {
    const context = isTopic ? `Topic: "${text}"` : `Text: ${text.substring(0, 40000)}`;

    const prompt = `Create EXACTLY ${count} educational flashcards.
${context}

Output ONLY a JSON array (no markdown, no extra text):
[{"front": "Question or key term", "back": "Clear, concise answer or definition"}]

Rules:
- front: 5-15 words, specific and testable
- back: 10-40 words, accurate and clear
- Cover the most important concepts
- No duplicate questions`;

    const response = await callJsonModel([{ role: "user", content: prompt }], 2500);

    const json = parseAIResponse(response);
    if (!Array.isArray(json) || json.length === 0) {
      throw new Error("Failed to generate flashcards. Please try again.");
    }
    return json.map((card: any, index: number) => ({
      id: `fc-${Date.now()}-${index}`,
      front: card.front || '',
      back: card.back || '',
      status: 'new' as const
    }));
  }, cacheKey);
};

// Generate quiz questions
export const generateQuiz = async (text: string, count: number = 5): Promise<QuizQuestion[]> => {
  const cacheKey = getCacheKey(`quiz_${count}`, text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async () => {
    const context = isTopic ? `Topic: "${text}"` : `Source Material: ${text.substring(0, 40000)}`;

    const prompt = `Generate exactly ${count} multiple-choice questions.
${context}

Rules:
- Test understanding and reasoning, NOT simple recall
- 4 answer choices (A, B, C, D) — all plausible, distractors from common misconceptions
- correctAnswer: 0-based index (0=A, 1=B, 2=C, 3=D)
- explanation: 2-3 sentences, why correct + why main distractor is wrong
- Academic language, AP/SAT difficulty level

Output ONLY a valid JSON array (no markdown, no extra text):
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":2,"explanation":"...","type":"multiple-choice"}]`;

    const response = await callJsonModel([{ role: "user", content: prompt }], 4000);

    const json = parseAIResponse(response);
    if (!Array.isArray(json) || json.length === 0) {
      throw new Error("Failed to generate quiz questions. Please try again.");
    }

    return json.map((q: any, index: number) => ({
      id: `qz-${Date.now()}-${index}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      type: 'multiple-choice' as const
    }));
  }, cacheKey);
};

// Generate multi-source quiz
export const generateMultiSourceQuiz = async (aggregatedText: string, count: number): Promise<QuizQuestion[]> => {
  return smartGenerate(async () => {
    const prompt = `Generate exactly ${count} multiple-choice quiz questions from the following content.
Content: ${aggregatedText.substring(0, 40000)}

Rules:
- Test understanding and reasoning, NOT simple recall
- 4 plausible answer choices (A, B, C, D); distractors from common misconceptions
- correctAnswer: 0-based index (0=A, 1=B, 2=C, 3=D)
- explanation: 2-3 sentences, why correct + why main distractor is wrong
- Cover different topics across the content

Output ONLY a valid JSON array (no markdown, no extra text):
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":2,"explanation":"...","type":"multiple-choice"}]`;

    const response = await callJsonModel([{ role: "user", content: prompt }], 4000);

    const json = parseAIResponse(response);
    if (!Array.isArray(json) || json.length === 0) {
      throw new Error("Failed to generate quiz questions. Please try again.");
    }
    return json.map((q: any, index: number) => ({
      id: `qz-exam-${Date.now()}-${index}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      type: 'multiple-choice' as const
    }));
  });
};

// SAT lesson generation
export const generateSATLesson = async (skillContext: string): Promise<string> => {
  const cacheKey = getCacheKey('sat_lesson', skillContext);

  return smartGenerate(async () => {
    const prompt = `Write a comprehensive SAT prep study guide for: ${skillContext}

Target Length: Minimum 400 words.

Output ONLY valid HTML starting immediately with <h2>. No preamble, no repeated instructions.

MISSION: Create structured notes designed so an AI can "see" the structure without guessing.
- One function per section: A section is either for learning (Key Ideas, Definitions) or for drilling (Examples, Practice Questions, Traps).
- One idea per line: Use bullets and short lines rather than chunky paragraphs.

Use this exact structural template, converting it strictly to HTML tags (<h2>, <h3>, <p>, <ul>, <li>, <strong>, etc.):

${skillContext.toLowerCase().includes('math') || skillContext.toLowerCase().includes('equations') || skillContext.toLowerCase().includes('functions') || skillContext.toLowerCase().includes('algebra') ?
        `<h2>[Topic Name]</h2>
<p><strong>Definition:</strong> [A clear definition]</p>
<p><strong>Key forms:</strong></p>
<ul>
  <li>[Form 1]</li>
  <li>[Form 2]</li>
</ul>
<p><strong>When it appears on SAT:</strong> [word problems, geometry intersections, etc.]</p>
<p><strong>Concept checklist:</strong></p>
<ul>
  <li>[Checklist item 1]</li>
  <li>[Checklist item 2]</li>
</ul>
<p><strong>Example 1 (easy):</strong></p>
<p>Q: [Question]</p>
<p>A: [Answer steps]</p>
<p><strong>Example 2 (hard):</strong></p>
<p>Q: [Question]</p>
<p>A: [Answer steps]</p>
<p><strong>Common traps:</strong></p>
<ul>
  <li>[Trap 1]</li>
  <li>[Trap 2]</li>
</ul>` :
        `<h2>Passage / Topic Overview</h2>
<ul>
  <li><strong>Passage summary:</strong> [Summary]</li>
  <li><strong>Main idea:</strong> [Main idea]</li>
  <li><strong>Author's claim:</strong> [Claim]</li>
  <li><strong>Tone:</strong> [Tone]</li>
  <li><strong>Purpose:</strong> [Purpose]</li>
  <li><strong>Key evidence:</strong>
    <ul>
      <li>[Evidence 1]</li>
      <li>[Evidence 2]</li>
    </ul>
  </li>
  <li><strong>Audience:</strong> [Audience]</li>
  <li><strong>Common wrong answer types:</strong>
    <ul>
      <li>[Trap 1]</li>
      <li>[Trap 2]</li>
    </ul>
  </li>
</ul>

<h2>SAT RW Question Types</h2>
<h3>[Question Type Name]</h3>
<ul>
  <li><strong>What it asks:</strong> [Description]</li>
  <li><strong>Strategy:</strong>
    <ul>
      <li>[Step 1]</li>
      <li>[Step 2]</li>
    </ul>
  </li>
  <li><strong>Look fors:</strong>
    <ul>
      <li>[Sign 1]</li>
      <li>[Sign 2]</li>
    </ul>
  </li>
  <li><strong>Traps:</strong>
    <ul>
      <li>[Trap 1]</li>
      <li>[Trap 2]</li>
    </ul>
  </li>
</ul>`}

Use <strong> for important concepts. Be thorough and specific to SAT content. Output ONLY HTML. No markdown formatting.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.3, 6000);

    return cleanHtml(response) || "<h2>Error generating lesson</h2>";
  }, cacheKey);
};

// SAT questions generation
export const generateSATQuestions = async (
  count: number,
  type: 'MATH' | 'READING_WRITING',
  context?: string,
  difficulty?: 'easy' | 'hard' | 'adaptive'
): Promise<QuizQuestion[]> => {
  const cacheKey = getCacheKey(`sat_${type}_${count}_${difficulty}`, context || 'gen');

  return smartGenerate(async () => {
    const isMath = type === 'MATH';
    const contextLine = context ? `Topic focus: ${context}.` : '';

    const mathDomains = `Cover a mix of:
- Algebra: linear equations, systems, inequalities
- Advanced Math: quadratics, polynomials, functions
- Problem-Solving & Data: ratios, percentages, statistics
- Geometry & Trig: area, angles, right triangles, unit circle`;

    const rwDomains = `Cover a mix of:
- Craft & Structure: word choice, text purpose, transitions
- Information & Ideas: central idea, evidence, inferences
- Expression of Ideas: rhetorical goals, sentence flow
- Standard English: grammar, punctuation, sentence boundaries
Each question MUST include a "passage" field (50-80 word authentic-style excerpt).`;

    const difficultyNote = difficulty === 'easy'
      ? 'Questions should be straightforward — test one concept at a time.'
      : difficulty === 'hard'
      ? 'Questions should be tricky — use multi-step reasoning and realistic wrong answers based on common mistakes.'
      : 'Mix of easy, medium, and hard questions like a real SAT section.';

    const formatExample = isMath
      ? `{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":1,"explanation":"...","type":"multiple-choice"}`
      : `{"passage":"...","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":1,"explanation":"...","type":"multiple-choice"}`;

    const prompt = `Generate exactly ${count} official-style digital SAT ${isMath ? 'Math' : 'Reading & Writing'} questions.
${contextLine}

STYLE: Mirror real SAT questions from official College Board practice tests. Questions should feel identical to what students see on test day.

${isMath ? mathDomains : rwDomains}

DIFFICULTY: ${difficultyNote}

QUESTION RULES:
- 4 answer choices (A–D); wrong answers come from real student mistakes
- correctAnswer: 0-based index (0=A, 1=B, 2=C, 3=D)
- Use real SAT phrasing: "Which choice best completes...", "What is the value of...", "Which finding, if true, would most support..."
- Explanations: 2-3 sentences in simple 8th-grade language — explain WHY the right answer is right AND why the top wrong answer tricks people

OUTPUT: Valid JSON array only. No markdown, no extra text.
[${formatExample}]`;

    const response = await callJsonModel([
      { role: "user", content: prompt }
    ], 4000);

    const json = parseAIResponse(response);
    if (!Array.isArray(json) || json.length === 0) {
      throw new Error("Failed to generate SAT questions. Please try again.");
    }

    return json.map((q: any, index: number) => ({
      id: `sat-${type}-${Date.now()}-${index}`,
      passage: q.passage || '',
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      type: 'multiple-choice' as const
    }));
  }, cacheKey);
};

export const generateAPLesson = async (subject: string, unit: string, topic: string): Promise<string> => {
  const cacheKey = getCacheKey('ap_lesson', `${subject}_${unit}_${topic} `);

  return smartGenerate(async () => {
    const prompt = `Generate a massively comprehensive AP ${subject} lesson for ${unit}: ${topic}

Target Length: Minimum 400 words. Make it extremely detailed. Absolutely do not make it short.
MISSION: Create college-level study materials matching official College Board AP standards structured for AI readability.

CORE PRINCIPLES:
- Design notes so an AI can "see" the structure without guessing.
- Consistent headings: Use <h2>, <h3> for levels.
- One function per section: A section is either for learning or for drilling, not both.
- One idea per line: Short lines > chunky paragraphs.
- Avoid visual noise: Depend purely on structure.

UNIVERSAL TEMPLATE TO FOLLOW EXACTLY (IN HTML):

<h2>Key Ideas</h2>
<ul>
  <li>[Idea]</li>
</ul>

<h2>Definitions</h2>
<ul>
  <li><strong>TERM:</strong> [Definition]</li>
</ul>

<h2>Formulas / Processes (if applicable)</h2>
<ul>
  <li><strong>Concept:</strong> [Name]
    <ul>
      <li><strong>Formula:</strong> [Details]</li>
      <li><strong>When to use:</strong> [Context]</li>
      <li><strong>Common trap:</strong> [Trap]</li>
    </ul>
  </li>
</ul>

<h2>Examples</h2>
<p><strong>Q:</strong> [Question]</p>
<p><strong>A:</strong> [Answer]</p>

<h2>Common Traps / Misconceptions</h2>
<ul>
  <li>[Trap 1]</li>
</ul>

<h2>Practice Questions</h2>
<p>1) [Question]<br>A) [Option]<br>B) [Option]<br>C) [Option]<br>D) [Option]</p>

HTML FORMATTING (STRICTLY NO MARKDOWN):
- Use only semantic HTML (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>)
- Output ONLY HTML. No markdown, no wrappers block. Start straight with <h2>.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.35, 8000);

    return cleanHtml(response) || "<h2>Error generating lesson</h2>";
  }, cacheKey);
};

// AP questions generation
export const generateAPQuestions = async (
  count: number,
  subject: string,
  unit: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuizQuestion[]> => {
  const cacheKey = getCacheKey(`ap_${subject}_${unit}`, difficulty);

  return smartGenerate(async () => {
    const diffMap = {
      easy:   'Straightforward — test basic understanding of core concepts. Most students who studied should get it.',
      medium: 'Requires analysis or applying a concept to a new situation. Some students will be tricked.',
      hard:   'Requires connecting multiple concepts or spotting a subtle distinction. Even prepared students may miss it.'
    };

    const subjectGuidance = subject.toLowerCase().includes('history') || subject.toLowerCase().includes('apush') || subject.toLowerCase().includes('world') || subject.toLowerCase().includes('euro')
      ? `History-specific: Use real historical thinking skills — causation, comparison, continuity/change over time.
Include time period context ("Between 1865–1900..." or "During the Cold War...").
Test interpretation, not memorization. Question stems: "Which best explains...", "The evidence most directly supports...", "Compared to X, Y was characterized by..."`
      : subject.toLowerCase().includes('bio') || subject.toLowerCase().includes('chem') || subject.toLowerCase().includes('physics') || subject.toLowerCase().includes('science')
      ? `Science-specific: Test conceptual understanding, experimental design, or data interpretation.
Use real lab-style scenarios. Question stems: "Which conclusion is best supported by...", "If X increases, Y would..."`
      : subject.toLowerCase().includes('english') || subject.toLowerCase().includes('lang') || subject.toLowerCase().includes('lit')
      ? `English-specific: Include a short passage (30–60 words). Test rhetorical analysis, author's purpose, or stylistic choices.
Question stems: "The passage primarily serves to...", "The author's tone can best be described as..."`
      : `Test higher-order thinking: analysis, application, evaluation. Use discipline-specific terminology correctly.`;

    const prompt = `Generate exactly ${count} AP ${subject} multiple-choice questions. Topic: ${unit}.

STYLE: These must look and feel like real questions from official AP released exams and AP Classroom. A student should not be able to tell the difference.

DIFFICULTY: ${diffMap[difficulty]}

SUBJECT GUIDANCE:
${subjectGuidance}

ANSWER CHOICE RULES:
- 4 choices (A–D), all plausible — no obviously wrong answers
- Wrong choices use real misconceptions students have, not random errors
- All choices similar length and parallel grammar
- correctAnswer: 0-based index

EXPLANATION RULES (critical):
- Write in simple 8th-grade vocabulary — explain like a friendly tutor
- 2-3 sentences: (1) why the right answer is correct, (2) why the most tempting wrong answer fails
- Use phrases like "This is right because...", "Choice X tricks you because..."

OUTPUT: Valid JSON array only. No markdown.
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":2,"explanation":"...","type":"multiple-choice"}]`;

    const response = await callJsonModel([
      { role: "user", content: prompt }
    ], 4000);

    const json = parseAIResponse(response);
    if (!Array.isArray(json) || json.length === 0) {
      throw new Error("Failed to generate AP questions. Please try again.");
    }

    return json.map((q: any, index: number) => ({
      id: `ap-${subject}-${Date.now()}-${index}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      type: 'multiple-choice' as const
    }));
  }, cacheKey);
};

export const chatWithResource = async (
  query: string,
  context: string,
  history: { role: string; content: string }[]
) => {
  if (!chatSpamLimiter.check()) {
    throw new Error("Please wait a moment before sending another message.");
  }

  const limits = getTierLimits();
  if (!dailyChatLimiter.check(limits.dailyChats)) {
    throw new Error(`Daily chat limit reached(${limits.dailyChats} messages).Please upgrade or wait 24h.`);
  }

  const isTopic = isShortOrUrl(context);
  const sysContext = isTopic ? `TOPIC CONTEXT: ${context} ` : `SYSTEM CONTEXT: ${context.substring(0, 50000)} `;

  const messages = [
    { role: "system", content: `${sysContext} \n\nINSTRUCTION: Answer strictly based on context.Be concise.` },
    ...history,
    { role: "user", content: query }
  ];

  const response = await callDeepSeek(messages as any);

  return (async function* () {
    yield { text: () => response || "No response generated." };
  })();
};

// Generate study plan
export const generateStudyPlan = async (goal: string): Promise<string[]> => {
  const cacheKey = getCacheKey('plan', goal);

  return smartGenerate(async () => {
    const prompt = `Create 5 actionable study steps for: "${goal}"

Output as a numbered list(1 - 5).
Each step should be specific and actionable(max 15 words).
  Simple, clear language.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.5, 2000); // Quality weekly plans with detailed tasks

    return response
      .split('\n')
      .filter(l => l.trim().length > 0)
      .map(l => l.replace(/^[\d\-\.\*]+\s*/, '').trim())
      .filter(l => l.length > 0)
      .slice(0, 5);
  }, cacheKey);
};

// Compatibility alias for APCenter
export const generateAPSummary = async (subject: string, unit: string, topic: string): Promise<string> => {
  return generateAPLesson(subject, unit, topic);
};

// Compatibility alias for APCenter
export const generateAPQuiz = async (
  count: number,
  subject: string,
  unit: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuizQuestion[]> => {
  return generateAPQuestions(count, subject, unit, difficulty);
};

// Generate weekly plan for StrategicPlanner flexibly based on user goals
export const generateWeeklyPlan = async (goals: string[]): Promise<Array<{
  day: string;
  tasks: Array<{ title: string, startTime: string, endTime: string }>;
}>> => {
  const combinedGoals = goals.join(', ');
  const cacheKey = getCacheKey('smart_plan', combinedGoals);

  return smartGenerate(async () => {
    const prompt = `Convert the following user scheduling request into a structured JSON plan: "${combinedGoals}"

INSTRUCTIONS:
1. Identify if they requested a specific number of days, days of the week, or times of day(e.g. "after 5pm").
2. Default to a 7 - day schedule if no timeframe is given.
3. Generate 1 - 4 highly actionable study tasks for each designated day.
4. If a time constraint is requested(e.g., "after 5pm"), make sure "startTime" and "endTime" reflect that constraint exactly(e.g., using 24 - hour time like "17:00" and "18:30").Otherwise, use reasonable times(like "09:00" or "14:00").

Format strictly as a JSON array where "day" is "Monday", "Tuesday", etc:
[
  {
    "day": "Monday",
    "tasks": [
      { "title": "Review AP Calc Limits", "startTime": "17:00", "endTime": "18:30" }
    ]
  }
]

Output ONLY valid JSON.Make it strictly parseable JSON.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.7, 3000);

    const json = parseAIResponse(response);

    if (Array.isArray(json) && json.length > 0) {
      return json.map((day: any) => ({
        day: day.day || 'Unknown',
        tasks: Array.isArray(day.tasks) ? day.tasks : []
      }));
    }

    // Fallback
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => ({
      day,
      tasks: [`Study session for ${goals[0] || 'your goals'}`]
    }));
  }, cacheKey);
};

// Deprecated function stub
export const generateFullSATExam = async () => {
  throw new Error("Use generateSATQuestions with specific modules instead.");
};
