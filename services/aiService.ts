import { Flashcard, QuizQuestion } from "../types";
import { generationRateLimiter, chatSpamLimiter, dailyChatLimiter, getTierLimits } from "../utils/security";
import axios from 'axios';

// Model selection — Dual Setup
const MODELS = {
  primary: "stepfun/step-3.5-flash:free",          // summaries, lessons, strategic planner, chat
  json: "arcee-ai/trinity-large-preview:free",      // quizzes, flashcards, SAT/AP questions (with JSON prompting)
  fallback: "stepfun/step-3.5-flash:free"
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

export const synthesizeVideoContent = async (url: string): Promise<string> => {
  try {
    const urlObj = new URL(url);
    let videoId = urlObj.searchParams.get('v');
    if (!videoId && urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    }
    if (!videoId || videoId.length < 10) throw new Error("Invalid YouTube URL");

    const targetUrl = 'https://www.youtube.com/watch?v=' + videoId;
    const html = await fetchWithFallback(targetUrl);

    // Find the player response JSON
    const regex = /"captions":({.*?})/;
    const match = html.match(regex);
    if (!match) throw new Error("No captions/transcripts found for this video");

    const captionsData = JSON.parse(match[1]);
    const captionTracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) throw new Error("No captions available for this video");

    const englishTrack = captionTracks.find((track: any) => track.languageCode === 'en' || (track.name?.simpleText || '').toLowerCase().includes('english')) || captionTracks[0];

    // Fetch the transcript XML using fallback proxies
    const xml = await fetchWithFallback(englishTrack.baseUrl);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");

    let transcript = "";
    for (let i = 0; i < textNodes.length; i++) {
      const content = textNodes[i].textContent;
      if (content) {
        transcript += content.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') + " ";
      }
    }

    const cleanTranscript = transcript.trim().replace(/\\s+/g, ' ');
    if (!cleanTranscript) {
      throw new Error("Extracted transcript is empty.");
    }
    return cleanTranscript;
  } catch (error: any) {
    console.error("Transcript extraction error:", error);
    throw new Error(`Failed to extract YouTube transcript: ${error.message}`);
  }
};

// Generate summary
export const generateSummary = async (text: string): Promise<string> => {
  if (!text) return "";

  const cacheKey = getCacheKey('summary', text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async () => {
    const contentLength = text.length;
    const wordCount = text.split(/\s+/).length;

    // Adaptive length based on source material depth
    let summaryGuidance = '';
    let termGuidance = '';
    let maxTokens = 4000;

    if (wordCount < 1000) {
      summaryGuidance = 'Target Length: Minimum 400 words (Focused summary). Focus on core concepts only.';
      termGuidance = 'Identify 10-15 core academic terms critical to understanding.';
      maxTokens = 2000;
    } else if (wordCount < 5000) {
      summaryGuidance = 'Target Length: Minimum 400 words up to 1500 words (Standard summary). Cover main ideas, key details, and significance.';
      termGuidance = 'Identify 20-30 advanced academic terms critical to understanding.';
      maxTokens = 3500;
    } else if (wordCount < 10000) {
      summaryGuidance = 'Target Length: Minimum 400 words up to 3000 words (Comprehensive summary). Include detailed analysis, context, chronological organization, causes/effects, and specific examples/evidence.';
      termGuidance = 'Identify 30-50 advanced academic terms critical to understanding.';
      maxTokens = 5000;
    } else {
      summaryGuidance = 'Target Length: Minimum 400 words up to 4000 words (Extensive summary). Provide in-depth coverage organized chronologically with full context, cause-and-effect analysis, and specific evidence.';
      termGuidance = 'Identify 40-60 advanced academic terms critical to understanding.';
      maxTokens = 6000;
    }

    const contextPrompt = isTopic
      ? `Generate professional study materials on the topic: "${text}". Research and provide comprehensive academic content suitable for AP-level study.`
      : `Analyze and synthesize the following source material into elite-level study content:\n\n${text.substring(0, 50000)}`;

    const prompt = `${contextPrompt}

MISSION: Create structured study materials that meet College Board AP and SAT standards, comparable to premium educational platforms ($10M+ tier).

CONTENT REQUIREMENTS:
${summaryGuidance}

ORGANIZATION STRUCTURE:
1. If material spans multiple time periods or generations, organize chronologically with clear period headers
2. Use hierarchical HTML structure: <h2> for major periods/themes, <h3> for subtopics
3. Present information in logical flow: context → main content → significance
4. Specifically include cause-and-effect analysis and specific examples/evidence from the source

WRITING STANDARDS:
- ALL summaries MUST be written using strictly 8th-grade level vocabulary so they are extremely easy to understand.
- However, you MUST STILL INCLUDE all the advanced academic vocabulary, concepts, and detailed information from the original source.
- Explain complex ideas simply without dumbing down the actual information.
- Professional tone matching AP textbooks but highly accessible.
- Focus on: key ideas, causes and effects, historical/conceptual significance, patterns, and connections.
- Emphasize WHY things matter, not just WHAT happened.

INTERACTIVE VOCABULARY:
- ${termGuidance}
- Wrap in: <span class="interactive-term" data-def="precise, clear definition">Term</span>
- Definitions should be concise (10-15 words) and academically precise

OUTPUT STRUCTURE AND DEPTH:
- Generate a comprehensive, step-by-step structured summary.
- Maximize reasoning depth and focus on concept-teaching.
- Prioritize accuracy and tutor-level clarity.
- Use numbered steps, clear headings, and concise summaries.
- Avoid hallucinations by strictly sticking to the provided text.

HTML FORMATTING (NO MARKDOWN):
- Use semantic HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- Bold key terms on first use: <strong>term</strong>
- Organize complex information with bulleted lists when appropriate
- NO markdown syntax (no ##, **, etc.)

STRUCTURAL RULES:
1. One function per section (learning or drilling)
2. One idea per line: Bullets & short lines > chunky paragraphs
3. Universal Template to follow strictly:

<h2>Key Ideas</h2>
<ul><li>[Idea]</li></ul>

<h2>Definitions</h2>
<ul><li><strong>[TERM]:</strong> [Definition]</li></ul>

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
<ul><li>[Trap 1]</li></ul>

<h2>Practice Questions</h2>
<p>1) [Question]<br>A) [Option]<br>B) [Option]<br>C) [Option]<br>D) [Option]</p>

OUTPUT QUALITY STANDARDS:
✓ Comparable to Khan Academy, Kaplan, Princeton Review premium content
✓ Publication-ready formatting
✓ Zero fluff or unnecessary elaboration
✓ Evidence-based and factually rigorous
✓ Appropriate depth matching source material complexity

Generate ONLY the HTML content. Begin immediately with <h2> tags.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.3, maxTokens); // Optimized dynamic tokens for fast response (<30s)

    return cleanHtml(response) || "<h2>Error generating summary</h2>";
  }, cacheKey);
};

// Generate flashcards
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

Wrap key terms in: <span class="interactive-term" data-def="concise definition">Term</span>
Use <strong> for important concepts. Be thorough and specific to SAT content. Output ONLY HTML.`;

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
  const cacheKey = getCacheKey(`sat_${type}_${count}`, context || 'gen');

  return smartGenerate(async () => {
    const typeDesc = type === 'MATH' ? 'SAT Math' : 'SAT Reading & Writing';
    const contextLine = context ? `Focus on: ${context}.` : '';
    const passageLine = type === 'READING_WRITING'
      ? `Each question MUST include a "passage" field (60-100 words, authentic text excerpt). Questions must test comprehension, vocabulary, or grammar based on the passage.`
      : '';
    const domainNote = type === 'MATH'
      ? `Cover: algebra, advanced math, data analysis, geometry/trig.`
      : `Cover: craft & structure, information & ideas, conventions, expression of ideas.`;

    const formatExample = type === 'READING_WRITING'
      ? `{"passage":"...","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":2,"explanation":"...","type":"multiple-choice"}`
      : `{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":2,"explanation":"...","type":"multiple-choice"}`;

    const prompt = `Generate exactly ${count} high-quality ${typeDesc} questions for the digital SAT (2024 format).
${contextLine}
${passageLine}
${domainNote}

Rules:
- 4 plausible answer choices; distractors from common student errors
- correctAnswer: 0-based index (0=A, 1=B, 2=C, 3=D)
- explanation: 2-3 sentences, why correct and why the main distractor is wrong
- Use SAT phrasing: "Which choice best...", "What is the value of..."
- Strive for extreme realism matching official SAT style and formatting.

Detailed Guidelines for Question Content:
${type === 'MATH' ? `Cover these specific types of questions accurately:
1. Algebra – rational equation
2. Functions – composition (e.g. given f(2)=7 and f(-1)=6, find a+b for f(x)=ax^2+bx+3)
3. Systems – word problem (e.g. costs for one-time fee and hourly rates)
4. Geometry – circle & line (e.g. distance between intersection points of a circle and a line)
5. Exponential – growth (e.g. bacteria doubling over time)` : `Cover these specific types of questions accurately:
1. Rhetoric – logical transition (using In other words, Nevertheless, etc.)
2. Sentence structure – comma/fragment (identifying correct sentence boundaries and punctuation)
3. Word choice – precision (selecting the most contextually appropriate word)
4. Reading – inference (interpreting critics vs scholars disagreements in short passages)
5. Concision & redundancy (choosing the most concise phrasing without losing meaning)`}

Output ONLY a valid JSON array (no markdown, no extra text):
[${formatExample}]`;

    const response = await callJsonModel([
      { role: "user", content: prompt }
    ], 6000);

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

// AP lesson generation
export const generateAPLesson = async (subject: string, unit: string, topic: string): Promise<string> => {
  const cacheKey = getCacheKey('ap_lesson', `${subject}_${unit}_${topic} `);

  return smartGenerate(async () => {
    const prompt = `Generate a massively comprehensive AP ${subject} lesson for ${unit}: ${topic}

Target Length: Minimum 400 words up to 5000 words. Make it extremely detailed and much longer than a standard summary. Absolutely do not make it short.
MISSION: Create college-level study materials matching official College Board AP standards structured for AI readability.

CONTENT REQUIREMENTS:
- Extensive detail, rigorous academic vocabulary.
- Focus on conceptual understanding, causation, and deeply interconnected analysis.
- Provide AP level frameworks for analysis (e.g., PERSIA for history).

STRUCTURAL RULES:
- Consistent headings (h2, h3).
- One function per section (learning or drilling).
- One idea per line: Bullets > paragraphs.

Use this universal template formatted strictly as HTML:

<h2>Key Ideas</h2>
<ul><li>[Idea 1]</li><li>[Idea 2]</li></ul>

<h2>Definitions</h2>
<ul><li><strong>[TERM]:</strong> [Definition]</li></ul>

<h2>Formulas / Processes (if applicable)</h2>
<ul>
  <li><strong>Concept:</strong> [Name]
    <ul>
      <li><strong>Formula/Process:</strong> [Details]</li>
      <li><strong>When to use:</strong> [Context]</li>
      <li><strong>Common trap:</strong> [Trap]</li>
    </ul>
  </li>
</ul>

<h2>Facts & Connections Layer</h2>
<ul>
  <li><strong>[Event/Concept]:</strong> [Date/Context] - [Significance]</li>
  <li><strong>[Person/Entity]:</strong> [Role] - [Why important]</li>
</ul>
<h3>Connections / Themes</h3>
<ul>
  <li>[Theme 1] &rarr; [Impact/Result]</li>
</ul>

<h2>Reasoning Skills & Application</h2>
<ul>
  <li><strong>Causation:</strong> [Example]</li>
  <li><strong>Continuity and change:</strong> [Example]</li>
  <li><strong>Comparison:</strong> [Example]</li>
</ul>

<h2>Examples</h2>
<p><strong>Q:</strong> [Question]</p>
<p><strong>A:</strong> [Answer]</p>

<h2>Common Traps / Misconceptions</h2>
<ul><li>[Trap]</li></ul>

<h2>Practice Questions</h2>
<p>1) [Question]<br>A) [Option]<br>B) [Option]<br>C) [Option]<br>D) [Option]</p>

HTML FORMATTING (STRICTLY NO MARKDOWN):
- Use only semantic HTML (<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>)
- Wrap 20+ critical terms in: <span class="interactive-term" data-def="precise definition">Term</span>
Output ONLY HTML.`;

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
  const cacheKey = getCacheKey(`ap_${subject}_${unit} `, difficulty);

  return smartGenerate(async () => {
    const difficultyGuidance = {
      easy: 'Foundation level: Test basic understanding of key concepts, definitions, and direct cause-effect relationships. 60-75% of students should answer correctly.',
      medium: 'Application level: Require analysis, comparison, or application of concepts to new situations. 40-55% of students should answer correctly.',
      hard: 'Synthesis level: Demand evaluation, synthesis of multiple concepts, or complex historical/scientific reasoning. 20-35% of students should answer correctly.'
    };

    const prompt = `MISSION: Generate EXACTLY ${count} authoritative, college - level multiple - choice questions for AP ${subject}.
Topic focus: ${unit}
Target difficulty: ${difficulty} (AP scale 1 - 5, where 4 - 5 is ${difficulty === 'hard' ? 'required' : 'optional'})

MAXIMUM REASONING DEPTH REQUIRED:
- Break down explanations into structured, numbered step - by - step tutor logic.
- Verify final answers meticulously.Prioritize accuracy over speed.
- Minimize hallucinations.Ensure distractors are based on plausible student misconceptions.

COLLEGE BOARD AP STANDARDS:
These questions must be indistinguishable from official AP exam questions.
  Reference: Released AP exams, AP Classroom question banks, official College Board practice materials.

AP QUESTION CHARACTERISTICS:
- Assess higher - order thinking: analysis, synthesis, evaluation, application
  - Require understanding of causation, comparison, change over time, or conceptual relationships
    - Often include stimulus material(quoted text, data, images described)
      - Emphasize skill application over content recall
        - Use formal academic language and discipline - specific terminology

QUESTION CONSTRUCTION BY SUBJECT:

FOR AP HISTORY(APUSH, World, Euro):
- Use historical thinking skills: causation, comparison, continuity / change, contextualization
  - Include time period context: "Between 1750-1900..." "In the post-WWII era..."
    - Reference specific evidence but test interpretation, not memorization
      - Question stems: "Which of the following best explains..." "The excerpt most directly reflects..." "Compared to X, Y was characterized by..."

FOR AP SCIENCE(Bio, Chem, Physics):
- Test conceptual understanding of scientific principles
  - Include data interpretation, experimental design, or model application
    - Use technical terminology correctly
      - Question stems: "If X is increased while Y remains constant..." "Which mechanism best explains..." "The data support which conclusion..."

FOR AP ENGLISH(Lit, Lang):
- Include passage excerpts(30 - 80 words) testing rhetorical analysis
  - Focus on author's purpose, rhetorical strategies, stylistic choices
    - Question stems: "The passage primarily serves to..." "The author's tone can best be described as..." "In context, the phrase X functions to..."

ANSWER CHOICE REQUIREMENTS(A - D):
- Parallel grammatical structure across all four
  - Similar length(within 10 words of each other)
    - Use complete sentences or sophisticated phrases(not single words)
      - Academic language: "facilitated" not "helped", "demonstrates" not "shows"

DISTRACTOR CREATION(OFFICIAL AP QUALITY):
AP exam distractors are exceptionally sophisticated.Each incorrect choice must:
- Contain partial truths or connect to related but distinct concepts
  - Result from plausible but flawed reasoning
    - Use correct terminology applied incorrectly
      - Be tempting to students who understand 70 % of the material

Examples of AP - quality distractors:
- History: Reference events from adjacent time periods with similar but incorrect causation
  - Science: Use correct processes but apply them to wrong scenarios
    - English: Identify correct literary devices but misinterpret their function

  AVOID(these are NOT AP-level):
✗ Simple definitional questions: "The term X means..."
✗ Isolated fact recall: "What year did..." "Who was the first to..."
✗ Obviously wrong choices that no prepared student would select
✗ Choices that are too similar or create confusion through ambiguity

EXPLANATION STRUCTURE:
40 - 70 words explaining:
1. Why the correct answer is right(cite specific reasoning / evidence)
2. Why the most tempting distractor is wrong(identify the logical flaw)
3. Use phrases like: "correctly identifies the causal relationship..." "accurately applies the principle of..." "fails to account for..."

DIFFICULTY CALIBRATION:
${difficulty === 'easy' ? '- Test direct application of core concepts\n- Single-step reasoning\n- Clearly defined parameters' : ''}
${difficulty === 'medium' ? '- Require analysis across multiple concepts\n- Two-step reasoning or comparison\n- Some ambiguity that careful reading resolves' : ''}
${difficulty === 'hard' ? '- Demand synthesis of multiple units/concepts\n- Multi-step reasoning with subtle distinctions\n- Require elimination of highly plausible distractors' : ''}

JSON FORMAT: We want exactly ${count} questions in the array.
[
  {
    "question": "In the context of [specific AP content], which of the following most accurately [assess specific skill]?",
    "options": [
      "A) It [sophisticated distractor - common misconception]",
      "B) It [sophisticated distractor - adjacent concept]",
      "C) It [CORRECT ANSWER - evidence-based and precise]",
      "D) It [sophisticated distractor - partially correct but flawed]"
    ],
    "correctAnswer": 2,
    "explanation": "Choice C correctly identifies [specific evidence/reasoning]. Choice A, while referencing [valid point], incorrectly suggests [flaw]. Choice B confuses [related concept] with [actual concept].",
    "type": "multiple-choice"
  }
]

FINAL QUALITY STANDARDS:
✓ Would this appear on an official AP ${subject} exam ?
✓ Does it test disciplinary skills, not just content knowledge ?
✓ Are all four choices defensible to a partially - prepared student ?
✓ Is the academic language precise and formal ?
✓ Does the explanation teach, not just confirm the answer ?

  Output ONLY valid JSON.No markdown, no preamble.`;

    const response = await callJsonModel([
      { role: "user", content: prompt }
    ], 6000);

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

// Chat with resource (streaming not supported, returns complete response)
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
