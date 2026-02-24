import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Graceful fallback for local dev if Upstash is not fully configured yet
const redisURL = process.env.UPSTASH_REDIS_REST_URL || "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

if (redisURL && redisToken) {
    redis = new Redis({
        url: redisURL,
        token: redisToken,
    });
    // 200 requests per 60 seconds per IP — generous enough for parallel generation (summary+flashcards+quiz)
    ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(200, "60 s"),
    });
}

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // 1. Rate Limiting Check
    if (ratelimit) {
        const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || "127.0.0.1";
        // Or grab UserID from a securely passed Auth token header here, e.g. req.headers.authorization
        const { success } = await ratelimit.limit(ip as string);
        if (!success) {
            return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }
    }

    // 2. Fetch Keys — StepFun key for summaries/lessons/planner, Trinity key for quizzes/flashcards/questions
    const stepfunKey = process.env.STEPFUN_API_KEY || process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || process.env.API_KEY;
    const trinityKey = process.env.ARCEE_API_KEY || process.env.TRINITY_API_KEY || stepfunKey;

    if (!stepfunKey) {
        return res.status(500).json({ error: "Server Configuration Error: API Provider Key Missing." });
    }

    // 3. Process Request
    const { model, messages, temperature, max_tokens } = req.body;

    // Route to correct API key based on model prefix
    const apiKey = (model && model.startsWith("arcee-ai/")) ? trinityKey : stepfunKey;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": req.headers.host || "https://ascentlearning.ai",
                "X-Title": "Ascent Learning Platform (Secure)",
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 4000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: `Provider API Error: ${errorText}` });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (err: any) {
        return res.status(500).json({ error: "Failed to communicate with AI provider", details: err.message });
    }
}
