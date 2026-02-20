import { Flashcard, QuizQuestion } from "../types";
import { generationRateLimiter, chatSpamLimiter, dailyChatLimiter, getTierLimits } from "../utils/security";

// DeepSeek R1 via OpenRouter configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model selection - use free models that work reliably
const MODELS = {
  primary: "nousresearch/hermes-3-llama-3.1-405b:free", // Hermes 3 405B (elite quality, free)
  fallback: "google/gemma-3-12b-it:free",              // Gemma 3 12B (fast, high quality backup)
  test: "google/gemini-2.0-flash-exp:free"             // Gemini for testing
};

// Start with primary, but allow override
let currentModel = MODELS.primary;

// Get API key from environment
const getApiKey = () => {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY; // Fallback to old var name
  return key || '';
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

// Call DeepSeek via OpenRouter
const callDeepSeek = async (
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
  maxTokens: number = 4000,
  attemptFallback: boolean = true
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_OPENROUTER_API_KEY in your environment variables.");
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "https://ascent-learning.app",
        "X-Title": "Ascent Learning Platform"
      },
      body: JSON.stringify({
        model: currentModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API Error with ${currentModel}:`, response.status, errorText);

      // Try fallback model if primary fails
      if (attemptFallback && currentModel === MODELS.primary) {
        console.log("Primary model failed, trying fallback model...");
        currentModel = MODELS.fallback;
        return await callDeepSeek(messages, temperature, maxTokens, false); // Don't recurse fallback
      }

      // Parse error for better user messages
      let userMessage = "AI generation failed. ";
      if (response.status === 401) {
        userMessage = "Invalid API key. Please check your VITE_OPENROUTER_API_KEY environment variable.";
      } else if (response.status === 429) {
        userMessage = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (response.status === 402) {
        userMessage = "Insufficient credits. Please add credits to your OpenRouter account at openrouter.ai";
      } else if (errorText.includes("model")) {
        userMessage = "AI model temporarily unavailable. Please try again in a moment.";
      } else {
        userMessage = `API error (${response.status}). Please try again.`;
      }

      throw new Error(userMessage);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected API response:", data);
      throw new Error("AI response format error. Please try again.");
    }

    const content = data.choices[0].message.content || "";
    console.log(`✓ Generated with ${currentModel}`);
    return content;

  } catch (error: any) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error("Network error:", error);
      throw new Error("Network error. Please check your internet connection and try again.");
    }
    // Re-throw formatted errors
    throw error;
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
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(cleanText);
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

  const firstTagIndex = cleaned.indexOf('<');
  if (firstTagIndex > 0) {
    cleaned = cleaned.substring(firstTagIndex);
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

  const maxAttempts = 3;

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

// YouTube video content synthesis
export const synthesizeVideoContent = async (url: string): Promise<string> => {
  try {
    const urlObj = new URL(url);
    let videoId = urlObj.searchParams.get('v');
    if (!videoId && urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    }
    if (!videoId || videoId.length < 10) throw new Error("Invalid YouTube URL");

    const targetUrl = 'https://www.youtube.com/watch?v=' + videoId;
    const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Could not fetch YouTube page");
    const data = await response.json();
    const html = data.contents;

    // Find the player response JSON
    const regex = /"captions":({.*?})/;
    const match = html.match(regex);
    if (!match) throw new Error("No captions/transcripts found for this video");

    const captionsData = JSON.parse(match[1]);
    const captionTracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) throw new Error("No captions available for this video");

    const englishTrack = captionTracks.find((track: any) => track.languageCode === 'en' || (track.name?.simpleText || '').toLowerCase().includes('english')) || captionTracks[0];

    // Fetch the transcript XML
    const xmlResponse = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(englishTrack.baseUrl));
    if (!xmlResponse.ok) throw new Error("Failed to fetch transcript XML");

    const xmlData = await xmlResponse.json();
    const xml = xmlData.contents;

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
      summaryGuidance = 'Focused summary (300-600 words): Focus on core concepts only.';
      termGuidance = 'Identify 10-15 core academic terms critical to understanding.';
      maxTokens = 2500;
    } else if (wordCount < 5000) {
      summaryGuidance = 'Standard summary (800-1500 words): Cover main ideas, key details, and significance.';
      termGuidance = 'Identify 20-30 advanced academic terms critical to understanding.';
      maxTokens = 4500;
    } else if (wordCount < 10000) {
      summaryGuidance = 'Comprehensive summary (2000-4000 words): Include detailed analysis, context, chronological organization, causes/effects, and specific examples/evidence.';
      termGuidance = 'Identify 30-50 advanced academic terms critical to understanding.';
      maxTokens = 6000;
    } else {
      summaryGuidance = 'Extensive summary (3000-5000 words): Provide in-depth coverage organized chronologically with full context, cause-and-effect analysis, and specific evidence.';
      termGuidance = 'Identify 40-60 advanced academic terms critical to understanding.';
      maxTokens = 8000;
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
- Academic vocabulary at 8th-grade level (clear but rigorous—avoid oversimplification)
- Professional tone matching AP textbooks and College Board materials
- Focus on: key ideas, causes and effects, historical/conceptual significance, patterns, and connections
- Include specific evidence, data, examples when available
- Emphasize WHY things matter, not just WHAT happened

INTERACTIVE VOCABULARY:
- ${termGuidance}
- Wrap in: <span class="interactive-term" data-def="precise, clear definition">Term</span>
- Definitions should be concise (10-15 words) and academically precise

HTML FORMATTING (NO MARKDOWN):
- Use semantic HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- Bold key terms on first use: <strong>term</strong>
- Organize complex information with bulleted lists when appropriate
- NO markdown syntax (no ##, **, etc.)

STRUCTURAL TEMPLATE:
<h2>Overview and Context</h2>
<p>[Brief introduction establishing significance and scope]</p>

<h2>[Main Content Section 1 - by period/theme]</h2>
<p>[Detailed analysis with causes, effects, and evidence]</p>

<h2>[Main Content Section 2]</h2>
<p>[Continue structured analysis]</p>

<h2>Historical/Conceptual Significance</h2>
<p>[Why this matters—long-term impact, connections to broader themes]</p>

<h2>Key Takeaways</h2>
<ul>
  <li>[Synthesis point 1]</li>
  <li>[Synthesis point 2]</li>
  <li>[Synthesis point 3]</li>
</ul>

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
export const generateFlashcards = async (text: string): Promise<Flashcard[]> => {
  const cacheKey = getCacheKey('flashcards', text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async () => {
    const contextPrompt = isTopic
      ? `Topic: "${text}"`
      : `Text: ${text.substring(0, 50000)}`;

    const prompt = `Create 10-15 educational flashcards from this content.
${contextPrompt}

Format as JSON array:
[
  {"front": "Question or term", "back": "Answer or definition"},
  ...
]

Focus on key concepts, terms, and facts.
Keep answers concise but complete.
Output ONLY the JSON array, no other text.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.5, 2200); // High quality flashcards with excellent definitions

    const json = parseAIResponse(response);
    return Array.isArray(json)
      ? json.map((card: any, index: number) => ({
        id: `fc-${Date.now()}-${index}`,
        front: card.front || '',
        back: card.back || '',
        status: 'new' as const
      }))
      : [];
  }, cacheKey);
};

// Generate quiz questions
export const generateQuiz = async (text: string, count: number = 5): Promise<QuizQuestion[]> => {
  const cacheKey = getCacheKey(`quiz_${count}`, text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async () => {
    const contextPrompt = isTopic
      ? `Topic: "${text}"`
      : `Source Material: ${text.substring(0, 50000)}`;

    const prompt = `${contextPrompt}

MISSION: Generate ${count} AP and SAT-level multiple-choice questions that assess deep understanding, critical thinking, and analytical reasoning—NOT simple recall.

COLLEGE BOARD QUALITY STANDARDS:
This must match the rigor of official SAT, AP U.S. History, AP World History, AP Biology, AP Chemistry, and AP English exams.
Think: Princeton Review, Kaplan, College Board official practice materials.

QUESTION TYPES (distribute across these categories):
1. ANALYSIS: "Which of the following best explains why..." "What was the primary cause of..."
2. INFERENCE: "Based on the information, one can reasonably conclude that..." "The passage suggests that..."
3. COMPARISON: "How does X differ from Y in terms of..." "Which statement accurately compares..."
4. EVIDENCE-BASED: "Which evidence best supports the claim that..." "The author's argument relies primarily on..."
5. CONCEPTUAL APPLICATION: "If this principle were applied to X, the result would be..." "This concept is most similar to..."

AVOID:
✗ Simple recall: "What year did X happen?" "Who was the leader of Y?"
✗ Vocabulary matching: "The term X means..."
✗ Obviously wrong distractors that no student would select

QUESTION CONSTRUCTION:
- Question stem: 20-40 words, academically precise, test understanding not memory
- Include context when needed: "In the context of [X], which statement..."
- Use formal academic language: "primary factor" not "main thing", "demonstrates" not "shows"

ANSWER CHOICES (CRITICAL):
- Label A, B, C, D (not 1, 2, 3, 4)
- Each choice: 10-25 words, parallel structure, similar length
- ALL FOUR must sound plausible to someone who partially understands the material
- Distractors should contain partial truths, common misconceptions, or adjacent concepts
- Only ONE choice is definitively correct based on evidence
- Use academic phrasing: "emerged primarily as a result of" not "happened because"

DISTRACTOR QUALITY (like real College Board exams):
- Include dates/facts that are close but not exact
- Reference related but distinct concepts
- Use partially correct statements with one critical flaw
- Mirror language from source material but apply it incorrectly

EXPLANATIONS:
- 30-60 words explaining WHY the correct answer is right
- Reference specific evidence from source material
- Explain why key distractors are incorrect (especially the most tempting one)
- Academic tone: "This choice accurately reflects..." "The evidence demonstrates..."

JSON FORMAT (strict):
[
  {
    "question": "In the context of [topic], which of the following best explains [concept]?",
    "options": [
      "A) [Plausible but incorrect - common misconception]",
      "B) [Plausible but incorrect - partially true]",
      "C) [CORRECT - evidence-based, precise]",
      "D) [Plausible but incorrect - related concept]"
    ],
    "correctAnswer": 2,
    "explanation": "Choice C accurately identifies [specific evidence]. Choice A incorrectly suggests [flaw]. Choice B, while partially true regarding [aspect], fails to account for [critical factor]."
  }
]

QUALITY CHECKLIST:
✓ Would this appear on an actual AP or SAT exam?
✓ Do all four choices require careful consideration?
✓ Does the question test understanding, not memorization?
✓ Are distractors realistic and challenging?
✓ Is the correct answer unambiguously supported by evidence?

Output ONLY the JSON array. No preamble, no markdown, no explanation outside the JSON.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.2, 5500); // Elite quality: detailed questions with sophisticated distractors

    const json = parseAIResponse(response);
    return Array.isArray(json)
      ? json.map((q: any, index: number) => ({
        id: `qz-${Date.now()}-${index}`,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        type: 'multiple-choice' as const
      }))
      : [];
  }, cacheKey);
};

// Generate multi-source quiz
export const generateMultiSourceQuiz = async (aggregatedText: string, count: number): Promise<QuizQuestion[]> => {
  return smartGenerate(async () => {
    const prompt = `Create ${count} comprehensive quiz questions from multiple sources.
Content: ${aggregatedText.substring(0, 50000)}

Format as JSON array with same structure as before.
Make questions challenging and cover different topics.
Output ONLY the JSON array.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.3, 4500); // Elite quality for comprehensive exams

    const json = parseAIResponse(response);
    return Array.isArray(json)
      ? json.map((q: any, index: number) => ({
        id: `qz-exam-${Date.now()}-${index}`,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        type: 'multiple-choice' as const
      }))
      : [];
  });
};

// SAT lesson generation
export const generateSATLesson = async (skillContext: string): Promise<string> => {
  const cacheKey = getCacheKey('sat_lesson', skillContext);

  return smartGenerate(async () => {
    const prompt = `Create a comprehensive SAT prep lesson on: ${skillContext}

Format as HTML with:
- <h2>Concept Overview</h2>
- <h2>Official SAT Rules</h2>
- <h2>Step-by-Step Strategy</h2>
- <h2>Common Traps</h2>
- <h2>Practice Examples</h2>

Use interactive terms: <span class="interactive-term" data-def="definition">Term</span>
8th grade reading level, clear and concise.
Output pure HTML only, no markdown.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ]);

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
    const typeDesc = type === 'MATH' ? 'SAT Math' : 'SAT Reading and Writing';
    const diffDesc = difficulty || 'adaptive difficulty (mix of moderate and challenging)';
    const contextDesc = context ? `DOMAIN FOCUS: ${context}. ` : 'Cover diverse domains within the section. ';

    const mathDomains = `
MATH DOMAINS (distribute questions across):
1. Algebra (linear equations, systems, inequalities, expressions)
2. Advanced Math (quadratics, exponentials, polynomials, functions)
3. Problem-Solving & Data Analysis (percentages, ratios, scatterplots, statistics)
4. Geometry & Trigonometry (area, volume, circles, triangles, trig ratios)`;

    const rwDomains = `
READING & WRITING DOMAINS (distribute questions across):
1. Craft and Structure (word choice, text structure, purpose, claims and evidence)
2. Information and Ideas (central ideas, inferences, command of evidence)
3. Standard English Conventions (grammar, punctuation, sentence structure)
4. Expression of Ideas (transitions, concision, rhetorical synthesis)`;

    const domains = type === 'MATH' ? mathDomains : rwDomains;

    const passageRequirement = type === 'READING_WRITING'
      ? `
PASSAGE REQUIREMENT FOR READING & WRITING:
Each question MUST include a 40-120 word passage in the "passage" field.
Passage types: literary fiction excerpt, social science argument, historical document, scientific explanation, humanities analysis.
Make passages authentic and substantive—not generic or artificially created.
Questions should test comprehension, analysis, or conventions BASED on the passage.`
      : '';

    const mathSpecifics = type === 'MATH'
      ? `
MATH QUESTION TYPES:
- Word problems requiring multi-step reasoning
- Interpreting graphs, tables, or data representations
- Applied algebra in real-world contexts
- Geometric reasoning with diagrams (describe diagram in question)
- Function analysis and transformations

MATH ANSWER CHOICES:
- Use realistic numerical values and expressions
- Include common calculation errors as distractors
- Use algebraically similar expressions that differ in key details
- No obvious patterns (like "all whole numbers" or "ascending order")`
      : '';

    const rwSpecifics = type === 'READING_WRITING'
      ? `
READING & WRITING QUESTION TYPES:
- "Which choice best states the main idea of the passage?"
- "As used in line X, 'word' most nearly means..."
- "Which choice provides the best evidence for the claim that..."
- "Which choice most effectively combines the sentences?"
- "Which choice completes the text with the most logical transition?"

READING & WRITING ANSWER CHOICES:
- All choices must be grammatically correct when testing conventions
- Use subtle meaning differences for vocabulary questions
- Make all transitions plausible for transition questions
- Use parallel structure and similar length across choices`
      : '';

    const prompt = `Generate ${count} official ${typeDesc} questions matching the digital SAT format (March 2024+).
${contextDesc}${domains}
${passageRequirement}
${mathSpecifics}
${rwSpecifics}

OFFICIAL SAT STANDARDS:
These questions must be indistinguishable from real College Board SAT questions.
Reference: Official Digital SAT Practice, Khan Academy SAT, Bluebook practice tests.

QUESTION CONSTRUCTION:
- Stem: Clear, concise, test-specific skills (20-50 words)
- Use official SAT phrasing: "Which choice best..." "Based on the text..." "What is the value of..."
- Include all necessary information (for math: values, constraints, relationships)
- ${type === 'MATH' ? 'No calculator dependency unless specifically testing that skill' : 'Passage-based with specific line references when needed'}

ANSWER CHOICES (A, B, C, D):
- Parallel grammatical structure across all four choices
- Similar length (within 5 words of each other)
- Alphabetical or numerical ordering when applicable
- ${type === 'MATH' ? 'Numerical answers in ascending order; algebraic expressions by degree' : 'Complete sentences or parallel phrases'}
- All four choices must be plausible to a student who understands 60-70% of the concept

DISTRACTOR CREATION (CRITICAL):
Official SAT distractors are HARD. They must:
- Result from common misunderstandings or calculation errors
- ${type === 'MATH' ? 'Come from arithmetic mistakes, sign errors, or formula misapplication' : 'Use words with similar meanings or slightly different emphasis'}
- Be defensible if the student makes ONE specific error in reasoning
- Never be obviously absurd or out of scope

${type === 'MATH' ? `
MATH EXAMPLE:
Question: "If 3x + 7 = 22, what is the value of 6x + 14?"
A) 30  [error: solved for x, didn't double everything]
B) 37  [error: doubled 22 instead of using correct relationship]
C) 44  [CORRECT: 2(3x + 7) = 2(22) = 44]
D) 51  [error: added instead of multiplied]` : `
READING EXAMPLE:
Passage: "The scientist's methodology was meticulous, involving repeated trials and systematic documentation..."
Question: "As used in the text, 'meticulous' most nearly means"
A) expensive  [wrong: not about cost]
B) careful  [CORRECT: precise and thorough]
C) innovative  [wrong: about novelty, not precision]
D) complex  [wrong: about difficulty, not thoroughness]`}

EXPLANATIONS:
30-50 words explaining:
1. Why the correct answer is right (with specific reasoning/calculation)
2. ${type === 'MATH' ? 'What error leads to the most common distractor' : 'Why the most tempting distractor is incorrect'}
3. Use precise academic language

DIFFICULTY CALIBRATION (${diffDesc}):
${difficulty === 'easy' ? '- Target: 70-85% of students answer correctly\n- Use straightforward application of concepts\n- Fewer steps, clearer relationships' : ''}
${difficulty === 'hard' ? '- Target: 25-40% of students answer correctly\n- Multi-step reasoning required\n- Combine multiple concepts\n- Distractors from sophisticated misconceptions' : ''}
${!difficulty || difficulty === 'adaptive' ? '- Mix: 40-50% moderate difficulty, 30-40% challenging, 10-20% very challenging\n- Gradually increase complexity through the set' : ''}

JSON FORMAT (exact structure):
[
  {
    ${type === 'READING_WRITING' ? '"passage": "Authentic 40-120 word passage here...",\n    ' : ''}"question": "Official SAT-style question stem?",
    "options": [
      "A) First choice",
      "B) Second choice", 
      "C) Third choice",
      "D) Fourth choice"
    ],
    "correctAnswer": 2,
    "explanation": "Choice C is correct because [specific reasoning]. Choice A results from [specific error].",
    "type": "multiple-choice"
  }
]

FINAL QUALITY CHECK:
✓ Could this appear on an actual SAT exam?
✓ Are all distractors challenging and realistic?
✓ Is the language formal and precise?
✓ ${type === 'READING_WRITING' ? 'Does each question have a substantive passage?' : 'Are numerical values realistic?'}
✓ Would a well-prepared student need to think carefully?

Output ONLY valid JSON. No markdown, no preamble, no explanation outside JSON.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.15, 6500); // Elite quality: College Board SAT standards with sophisticated distractors

    const json = parseAIResponse(response);
    return Array.isArray(json)
      ? json.map((q: any, index: number) => ({
        id: `sat-${type}-${Date.now()}-${index}`,
        passage: q.passage || '',
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        type: 'multiple-choice' as const
      }))
      : [];
  }, cacheKey);
};

// AP lesson generation
export const generateAPLesson = async (subject: string, unit: string, topic: string): Promise<string> => {
  const cacheKey = getCacheKey('ap_lesson', `${subject}_${unit}_${topic}`);

  return smartGenerate(async () => {
    const prompt = `Generate a comprehensive AP ${subject} lesson for ${unit}: ${topic}

MISSION: Create college-level study materials matching official College Board AP standards and premium test prep platforms (Kaplan, Princeton Review, Barron's).

CONTENT REQUIREMENTS:
- Appropriate for AP college-credit curriculum (ages 16-18, college-level rigor)
- Academic vocabulary at AP level (use discipline-specific terminology correctly)
- Length: 1200-2000 words for comprehensive coverage
- Focus on conceptual understanding, not memorization

ORGANIZATION STRUCTURE (use chronological/thematic organization when applicable):
<h2>Learning Objectives</h2>
<p>Clearly state 3-5 measurable learning objectives from official AP ${subject} Course and Exam Description</p>

<h2>Historical/Conceptual Context</h2>
<p>Establish background, prior developments, or foundational concepts needed to understand this topic</p>

<h2>Core Content</h2>
[Organize by time periods, themes, or conceptual progression as appropriate]
<h3>Subtopic 1</h3>
<p>Detailed explanation with causes, effects, evidence, and specific examples</p>

<h3>Subtopic 2</h3>
<p>Continue structured analysis with connections to broader themes</p>

<h2>Key Concepts and Vocabulary</h2>
<p>Synthesize essential terminology and theoretical frameworks</p>
- Wrap 25-40 critical terms in: <span class="interactive-term" data-def="precise academic definition">Term</span>
- Definitions should be college-level but clear (15-25 words)

<h2>Analytical Frameworks</h2>
<p>Provide frameworks for analysis that appear on AP exams (e.g., PERSIA for history, enzyme kinetics for bio)</p>

<h2>Common Misconceptions</h2>
<ul>
  <li>Address frequent student errors and clarify complex concepts</li>
  <li>Explain why incorrect interpretations are wrong</li>
</ul>

<h2>Connections and Significance</h2>
<p>Link to other units, broader themes, and real-world applications</p>
<p>Emphasize historical significance, theoretical importance, or practical applications</p>

<h2>AP Exam Preparation</h2>
<ul>
  <li>Typical question types for this topic</li>
  <li>Key evidence or examples to memorize</li>
  <li>Essay/FRQ strategies specific to this content</li>
</ul>

WRITING STANDARDS:
- Match the tone and rigor of official College Board AP materials
- Use discipline-specific academic language professionally
- Include specific evidence: dates, names, data, examples from scholarly sources
- Explain causes and effects with nuance (multiple causation, long-term vs. short-term)
- Make connections between concepts explicit
- Bold key terms on first use: <strong>term</strong>

QUALITY BENCHMARKS:
✓ Comparable to AP textbooks: "The American Pageant," "Campbell Biology," "Chemistry: The Central Science"
✓ Incorporates official AP thematic learning objectives
✓ Addresses common FRQ and MCQ topics from past exams
✓ Provides analytical tools usable on exam day
✓ No oversimplification—this is college-level content

OUTPUT: Pure HTML only, beginning with <h2>. No markdown, no preamble.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.25, 7000); // Elite quality: comprehensive AP college-level content

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
    const difficultyGuidance = {
      easy: 'Foundation level: Test basic understanding of key concepts, definitions, and direct cause-effect relationships. 60-75% of students should answer correctly.',
      medium: 'Application level: Require analysis, comparison, or application of concepts to new situations. 40-55% of students should answer correctly.',
      hard: 'Synthesis level: Demand evaluation, synthesis of multiple concepts, or complex historical/scientific reasoning. 20-35% of students should answer correctly.'
    };

    const prompt = `Generate ${count} official AP ${subject} multiple-choice questions for ${unit}.
Target Difficulty: ${difficulty} - ${difficultyGuidance[difficulty]}

COLLEGE BOARD AP STANDARDS:
These questions must be indistinguishable from official AP exam questions.
Reference: Released AP exams, AP Classroom question banks, official College Board practice materials.

AP QUESTION CHARACTERISTICS:
- Assess higher-order thinking: analysis, synthesis, evaluation, application
- Require understanding of causation, comparison, change over time, or conceptual relationships
- Often include stimulus material (quoted text, data, images described)
- Emphasize skill application over content recall
- Use formal academic language and discipline-specific terminology

QUESTION CONSTRUCTION BY SUBJECT:

FOR AP HISTORY (APUSH, World, Euro):
- Use historical thinking skills: causation, comparison, continuity/change, contextualization
- Include time period context: "Between 1750-1900..." "In the post-WWII era..."
- Reference specific evidence but test interpretation, not memorization
- Question stems: "Which of the following best explains..." "The excerpt most directly reflects..." "Compared to X, Y was characterized by..."

FOR AP SCIENCE (Bio, Chem, Physics):
- Test conceptual understanding of scientific principles
- Include data interpretation, experimental design, or model application
- Use technical terminology correctly
- Question stems: "If X is increased while Y remains constant..." "Which mechanism best explains..." "The data support which conclusion..."

FOR AP ENGLISH (Lit, Lang):
- Include passage excerpts (30-80 words) testing rhetorical analysis
- Focus on author's purpose, rhetorical strategies, stylistic choices
- Question stems: "The passage primarily serves to..." "The author's tone can best be described as..." "In context, the phrase X functions to..."

ANSWER CHOICE REQUIREMENTS (A-D):
- Parallel grammatical structure across all four
- Similar length (within 10 words of each other)
- Use complete sentences or sophisticated phrases (not single words)
- Academic language: "facilitated" not "helped", "demonstrates" not "shows"

DISTRACTOR CREATION (OFFICIAL AP QUALITY):
AP exam distractors are exceptionally sophisticated. Each incorrect choice must:
- Contain partial truths or connect to related but distinct concepts
- Result from plausible but flawed reasoning
- Use correct terminology applied incorrectly
- Be tempting to students who understand 70% of the material

Examples of AP-quality distractors:
- History: Reference events from adjacent time periods with similar but incorrect causation
- Science: Use correct processes but apply them to wrong scenarios
- English: Identify correct literary devices but misinterpret their function

AVOID (these are NOT AP-level):
✗ Simple definitional questions: "The term X means..."
✗ Isolated fact recall: "What year did..." "Who was the first to..."
✗ Obviously wrong choices that no prepared student would select
✗ Choices that are too similar or create confusion through ambiguity

EXPLANATION STRUCTURE:
40-70 words explaining:
1. Why the correct answer is right (cite specific reasoning/evidence)
2. Why the most tempting distractor is wrong (identify the logical flaw)
3. Use phrases like: "correctly identifies the causal relationship..." "accurately applies the principle of..." "fails to account for..."

DIFFICULTY CALIBRATION:
${difficulty === 'easy' ? '- Test direct application of core concepts\n- Single-step reasoning\n- Clearly defined parameters' : ''}
${difficulty === 'medium' ? '- Require analysis across multiple concepts\n- Two-step reasoning or comparison\n- Some ambiguity that careful reading resolves' : ''}
${difficulty === 'hard' ? '- Demand synthesis of multiple units/concepts\n- Multi-step reasoning with subtle distinctions\n- Require elimination of highly plausible distractors' : ''}

JSON FORMAT:
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
✓ Would this appear on an official AP ${subject} exam?
✓ Does it test disciplinary skills, not just content knowledge?
✓ Are all four choices defensible to a partially-prepared student?
✓ Is the academic language precise and formal?
✓ Does the explanation teach, not just confirm the answer?

Output ONLY valid JSON. No markdown, no preamble.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.2, 6500); // Elite quality: official AP exam-level questions

    const json = parseAIResponse(response);
    return Array.isArray(json)
      ? json.map((q: any, index: number) => ({
        id: `ap-${subject}-${Date.now()}-${index}`,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        type: 'multiple-choice' as const
      }))
      : [];
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
    throw new Error(`Daily chat limit reached (${limits.dailyChats} messages). Please upgrade or wait 24h.`);
  }

  const isTopic = isShortOrUrl(context);
  const sysContext = isTopic ? `TOPIC CONTEXT: ${context}` : `SYSTEM CONTEXT: ${context.substring(0, 50000)}`;

  const messages = [
    { role: "system", content: `${sysContext}\n\nINSTRUCTION: Answer strictly based on context. Be concise.` },
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

Output as a numbered list (1-5).
Each step should be specific and actionable (max 15 words).
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

// Generate weekly plan for StrategicPlanner
export const generateWeeklyPlan = async (goals: string[]): Promise<Array<{
  day: string;
  tasks: string[];
}>> => {
  const combinedGoals = goals.join(', ');
  const cacheKey = getCacheKey('weekly_plan', combinedGoals);

  return smartGenerate(async () => {
    const prompt = `Create a detailed weekly study plan for these goals: ${combinedGoals}

Generate a structured plan for 7 days (Monday through Sunday).
For each day, provide 2-4 specific study tasks.
Each task should be actionable and take 30-90 minutes.

Format as JSON array:
[
  {
    "day": "Monday",
    "tasks": ["Task 1", "Task 2", "Task 3"]
  },
  ...
]

Make tasks specific, measurable, and progressive throughout the week.
Output ONLY the JSON array.`;

    const response = await callDeepSeek([
      { role: "user", content: prompt }
    ], 0.7, 2000);

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
