// ── SurakshYatra AI Service ───────────────────────────────────────────────────
// Uses axios to call the Gemini REST API directly (Google AI Studio key).
// API key is read from .env (VITE_GEMINI_API_KEY).

import axios from "axios";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// Model fallback chain — tries each until one responds successfully
const MODELS = [
    "gemini-3-flash-preview"
] as const;

// ── Core helper ───────────────────────────────────────────────────────────────

/**
 * Call Gemini via axios REST (v1beta — correct for Google AI Studio keys).
 * Tries each model in MODELS until one succeeds.
 */
async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
    let lastError: unknown;

    for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        try {
            console.log(`🤖 [AI] Trying ${model}…`);

            const { data } = await axios.post(
                url,
                {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: "user", parts: [{ text: userMessage }] }],
                    generationConfig: { temperature: 0.7 },
                },
                { headers: { "Content-Type": "application/json" } }
            );

            const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            console.log(`✅ [AI] Response from ${model}:`, raw);
            return raw;
        } catch (err) {
            console.warn(`⚠️ [AI] ${model} failed:`, err);
            lastError = err;
        }
    }

    throw lastError ?? new Error("All Gemini models failed");
}

// ── Preference suggestions ────────────────────────────────────────────────────

const PREF_SYSTEM_PROMPT = `You are SurakshYatra, an AI travel safety planner.
Given a destination and group type, return a JSON object with the most relevant travel preference IDs for that destination, chosen only from:
  popular, museum, nature, foodie, history, shopping, adventure, beach, nightlife, wellness, spiritual, trekking

"suggested" = top 3 IDs to pre-select. "all" = full ranked list (all 12).

Respond strictly with:
{ "suggested": ["id1","id2","id3"], "all": ["id1","id2",...] }`;

export interface PrefSuggestion {
    suggested: string[];
    all: string[];
}

function prefCacheKey(destination: string, groupSize: string) {
    return `pref:${destination.toLowerCase()}:${groupSize}`;
}

export async function fetchPrefSuggestions(
    destination: string,
    groupSize: string
): Promise<PrefSuggestion> {
    // Serve from session cache if available
    const cacheKey = prefCacheKey(destination, groupSize);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            console.log("✅ [AI] Loaded from session cache:", parsed);
            return parsed;
        } catch { /* ignore corrupt cache */ }
    }

    const raw = await callGemini(
        PREF_SYSTEM_PROMPT,
        `Destination: ${destination}\nGroup: ${groupSize}`
    );

    // Strip accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const result: PrefSuggestion = {
        suggested: Array.isArray(parsed.suggested) ? parsed.suggested : [],
        all: Array.isArray(parsed.all) ? parsed.all : [],
    };

    console.log("📦 [AI] Final preference JSON:", result);

    sessionStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
}
