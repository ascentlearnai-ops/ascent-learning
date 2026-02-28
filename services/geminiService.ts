import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Flashcard, QuizQuestion } from "../types";
import { generationRateLimiter, chatSpamLimiter, dailyChatLimiter, getTierLimits } from "../utils/security";

// Initialize API with environment variable
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : null);
  return key || '';
};

let genAI: GoogleGenerativeAI | null = null;

const initializeAI = () => {
  if (!genAI) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API Key is missing. Please set VITE_GEMINI_API_KEY in your Vercel environment variables.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

// Model cascade: Free tier friendly models
const MODEL_CASCADE = [
  'gemini-2.0-flash-exp',      // Latest experimental flash (free tier)
  'gemini-1.5-flash',          // Stable flash model (free tier)
  'gemini-1.5-flash-8b',       // Lighter model (free tier)
  'gemini-1.5-pro'             // Fallback pro model
];

// Response cache for optimization
const responseCache = new Map<string, any>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

const getCacheKey = (type: string, content: string) => {
  let hash = 0;
  const str = content.substring(0, 1000); // Use first 1000 chars for hash
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
  // Clean old cache entries (keep max 100 entries)
  if (responseCache.size > 100) {
    const oldestKey = Array.from(responseCache.keys())[0];
    responseCache.delete(oldestKey);
  }
};

// Parse AI JSON responses
const parseAIResponse = (text: string | undefined): any => {
  if (!text) return [];
  try {
    let cleanText = text.trim();

    // Remove markdown code blocks if present
    cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    // Extract just the array or object to ignore conversational text
    if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanText);

    // Most callers expect an array. Protect against single returned objects.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return [parsed];
    }

    return parsed;
  } catch (e) {
    console.error("JSON Parse Error:", e, "Text:", text?.substring(0, 200));
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

// Smart generation with model cascade and retry logic
const smartGenerate = async <T>(
  generateFn: (model: GenerativeModel) => Promise<T>,
  cacheKey?: string
): Promise<T> => {
  // Check cache first
  if (cacheKey) {
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) return cached;
  }

  const ai = initializeAI();
  const maxAttempts = 3;
  let modelIndex = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Rate limiting check
      if (!generationRateLimiter.check()) {
        await new Promise(r => setTimeout(r, 1000));
      }

      const modelName = MODEL_CASCADE[modelIndex];
      const model = ai.getGenerativeModel({ model: modelName });

      console.log(`🤖 Using model: ${modelName} (attempt ${attempt + 1})`);

      const result = await generateFn(model);

      // Cache successful result
      if (cacheKey && result) {
        setCachedResponse(cacheKey, result);
      }

      return result;

    } catch (error: any) {
      console.warn(`Attempt ${attempt + 1} failed:`, error.message);

      const errorMsg = error.message?.toLowerCase() || '';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit');
      const isModelError = errorMsg.includes('not found') || errorMsg.includes('404');
      const isAuthError = errorMsg.includes('api key') || errorMsg.includes('401') || errorMsg.includes('403');

      // Fatal errors
      if (isAuthError) {
        throw new Error("Invalid API Key. Please check your Vercel environment variables.");
      }

      // Try next model on model-specific errors
      if (isModelError && modelIndex < MODEL_CASCADE.length - 1) {
        modelIndex++;
        console.log(`⚠️  Switching to: ${MODEL_CASCADE[modelIndex]}`);
        continue;
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
  const cacheKey = getCacheKey('video', url);

  return smartGenerate(async (model) => {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze this YouTube video URL and provide comprehensive educational content: ${url}

INSTRUCTIONS:
1. Extract or infer the video topic from the URL
2. Provide detailed, educational content on that topic
3. Include key concepts, explanations, and important facts
4. Format as clear, structured text suitable for study

If you cannot access the video directly, provide expert-level educational content on the topic inferred from the URL.

Output should be comprehensive (500+ words) and educational.`
        }]
      }]
    });

    const text = result.response.text();
    if (!text || text.length < 100) {
      throw new Error("Could not generate video content. Please paste the transcript directly.");
    }
    return text;
  }, cacheKey);
};

// Generate summary
export const generateSummary = async (text: string): Promise<string> => {
  if (!text) return "";

  const cacheKey = getCacheKey('summary', text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async (model) => {
    const prompt = isTopic
      ? `Generate a comprehensive educational summary on the topic: "${text}". Provide detailed explanations suitable for studying.`
      : `Create a detailed study summary of the following content: ${text.substring(0, 50000)}`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `${prompt}

Format as HTML using these tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>
Use simple, clear language (8th grade reading level).
Wrap 15-30 key terms in: <span class="interactive-term" data-def="simple definition">Term</span>

Structure:
- <h2>Overview</h2>
- <h2>Key Concepts</h2>
- <h2>Important Details</h2>
- <h2>Summary</h2>

NO markdown code blocks. Output pure HTML only.`
        }]
      }]
    });

    return cleanHtml(result.response.text()) || "<h2>Error generating summary</h2>";
  }, cacheKey);
};

// Generate flashcards
export const generateFlashcards = async (text: string, count: number = 8): Promise<Flashcard[]> => {
  const cacheKey = getCacheKey('flashcards', text);
  const isTopic = isShortOrUrl(text);

  return smartGenerate(async (model) => {
    const prompt = isTopic
      ? `Topic: "${text}"`
      : `Text: ${text.substring(0, 50000)}`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create ${count} educational flashcards from this content.
${prompt}

Format as JSON array:
[
  {"front": "Question or term", "back": "Answer or definition"},
  ...
]

Focus on key concepts, terms, and facts.
Keep answers concise but complete.
Output ONLY the JSON array, no other text.`
        }]
      }]
    });

    const json = parseAIResponse(result.response.text());
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

  return smartGenerate(async (model) => {
    const prompt = isTopic
      ? `Topic: "${text}"`
      : `Text: ${text.substring(0, 50000)}`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create ${count} multiple-choice quiz questions.
${prompt}

Format as JSON array:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct"
  },
  ...
]

Rules:
- Include 4 options per question
- correctAnswer is the index (0-3) of the correct option
- No LaTeX, use plain text for math
- Provide clear explanations
Output ONLY the JSON array.`
        }]
      }]
    });

    const json = parseAIResponse(result.response.text());
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
  return smartGenerate(async (model) => {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create ${count} comprehensive quiz questions from multiple sources.
Content: ${aggregatedText.substring(0, 50000)}

Format as JSON array with same structure as before.
Make questions challenging and cover different topics.
Output ONLY the JSON array.`
        }]
      }]
    });

    const json = parseAIResponse(result.response.text());
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

// SAT-specific functions
export const generateSATLesson = async (skillContext: string): Promise<string> => {
  const cacheKey = getCacheKey('sat_lesson', skillContext);

  return smartGenerate(async (model) => {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create a comprehensive SAT prep lesson on: ${skillContext}

Format as HTML with:
- <h2>Concept Overview</h2>
- <h2>Official SAT Rules</h2>
- <h2>Step-by-Step Strategy</h2>
- <h2>Common Traps</h2>
- <h2>Practice Examples</h2>

Use interactive terms: <span class="interactive-term" data-def="definition">Term</span>
8th grade reading level, clear and concise.
Output pure HTML only, no markdown.`
        }]
      }]
    });

    return cleanHtml(result.response.text()) || "<h2>Error generating lesson</h2>";
  }, cacheKey);
};

export const generateSATQuestions = async (
  count: number,
  type: 'MATH' | 'READING_WRITING',
  context?: string,
  difficulty?: 'easy' | 'hard' | 'adaptive'
): Promise<QuizQuestion[]> => {
  const cacheKey = getCacheKey(`sat_${type}_${count}`, context || 'gen');

  return smartGenerate(async (model) => {
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

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const json = parseAIResponse(result.response.text());
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

// AP Course functions
export const generateAPLesson = async (subject: string, unit: string, topic: string): Promise<string> => {
  const cacheKey = getCacheKey('ap_lesson', `${subject}_${unit}_${topic}`);

  return smartGenerate(async (model) => {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create an AP-level lesson for:
Subject: ${subject}
Unit: ${unit}
Topic: ${topic}

Format as detailed HTML with:
- <h2>Learning Objectives</h2>
- <h2>Key Concepts</h2>
- <h2>Detailed Explanations</h2>
- <h2>Examples</h2>
- <h2>Practice Tips</h2>

Use college-level vocabulary but explain clearly.
Include interactive terms: <span class="interactive-term" data-def="definition">Term</span>
Output pure HTML only.`
        }]
      }]
    });

    return cleanHtml(result.response.text()) || "<h2>Error generating lesson</h2>";
  }, cacheKey);
};

export const generateAPQuestions = async (
  count: number,
  subject: string,
  unit: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<QuizQuestion[]> => {
  const cacheKey = getCacheKey(`ap_${subject}_${unit}`, difficulty);

  return smartGenerate(async (model) => {
    const difficultyGuidance = {
      easy: 'Foundation level: Test basic understanding of key concepts, definitions, and direct cause-effect relationships. 60-75% of students should answer correctly.',
      medium: 'Application level: Require analysis, comparison, or application of concepts to new situations. 40-55% of students should answer correctly.',
      hard: 'Synthesis level: Demand evaluation, synthesis of multiple concepts, or complex historical/scientific reasoning. 20-35% of students should answer correctly.'
    };

    const prompt = `MISSION: Generate EXACTLY ${count} authoritative, college-level multiple-choice questions for AP ${subject}.
Topic focus: ${unit}
Target difficulty: ${difficulty} (AP scale 1-5, where 4-5 is ${difficulty === 'hard' ? 'required' : 'optional'})

MAXIMUM REASONING DEPTH REQUIRED:
- Break down explanations into structured, numbered step-by-step tutor logic.
- Verify final answers meticulously. Prioritize accuracy over speed.
- Minimize hallucinations. Ensure distractors are based on plausible student misconceptions.

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
✓ Would this appear on an official AP ${subject} exam?
✓ Does it test disciplinary skills, not just content knowledge?
✓ Are all four choices defensible to a partially-prepared student?
✓ Is the academic language precise and formal?
✓ Does the explanation teach, not just confirm the answer?

Output ONLY valid JSON. No markdown, no preamble.`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const json = parseAIResponse(result.response.text());
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

// Chat with resource
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

  const ai = initializeAI();
  const model = ai.getGenerativeModel({ model: MODEL_CASCADE[0] });

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: `Context: ${context.substring(0, 50000)}\n\nAnswer questions based strictly on this context.` }]
      },
      {
        role: 'model',
        parts: [{ text: "I understand. I'll answer based on the provided context." }]
      },
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: h.content }]
      }))
    ]
  });

  const result = await chat.sendMessageStream(query);
  return result.stream;
};

// Generate study plan
export const generateStudyPlan = async (goal: string): Promise<string[]> => {
  const cacheKey = getCacheKey('plan', goal);

  return smartGenerate(async (model) => {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create 5 actionable study steps for: "${goal}"

Output as a numbered list (1-5).
Each step should be specific and actionable (max 15 words).
Simple, clear language.`
        }]
      }]
    });

    const text = result.response.text();
    return text
      .split('\n')
      .filter((l: string) => l.trim().length > 0)
      .map((l: string) => l.replace(/^[\d\-\.\*]+\s*/, '').trim())
      .filter((l: string) => l.length > 0)
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

  return smartGenerate(async (model) => {
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

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    });

    const text = result.response.text();
    const json = parseAIResponse(text);

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
      tasks: [{ title: `Study session for ${goals[0] || 'your goals'}`, startTime: '09:00', endTime: '10:00' }]
    }));
  }, cacheKey);
};

// Fallback stubs for deprecated functions
export const generateFullSATExam = async () => {
  throw new Error("Use generateSATQuestions with specific modules instead.");
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
