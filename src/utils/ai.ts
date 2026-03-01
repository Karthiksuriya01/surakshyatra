// ── OpenRouter AI helper for SurakshYatra ─────────────────────────────────────

const OPENROUTER_API_KEY = "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4o-mini";

export interface AIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// ── Core chat completion call ─────────────────────────────────────────────────

export async function callAI(messages: AIMessage[]): Promise<string> {
    const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://surakshyatra.vercel.app",
            "X-Title": "SurakshYatra Trip Planner",
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            response_format: { type: "json_object" },
            temperature: 0.7,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
}

// ── Preference suggestion ─────────────────────────────────────────────────────
//
// Available pref IDs (must match PREFS in data.ts):
//   popular | museum | nature | foodie | history | shopping
// Plus extended ones for AI: adventure | beach | nightlife | wellness | spiritual | trekking
//
// The AI returns up to 4 IDs to pre-select, ranked by relevance.

const PREF_SYSTEM_PROMPT = `You are SurakshYatra, an AI travel planner specialising in personalised and safe trip planning.

Given a travel destination and group type, return a JSON object recommending the most relevant travel preference categories for that destination. Only recommend from this fixed list of IDs:
  popular, museum, nature, foodie, history, shopping, adventure, beach, nightlife, wellness, spiritual, trekking

Rank them by how relevant they are for the destination. Return at most 4 IDs as "suggested" and the full ordered list as "all".

Respond strictly with:
{
  "suggested": ["id1", "id2", "id3"],
  "all": ["id1", "id2", "id3", "id4", "id5", "id6"]
}`;

export interface PrefSuggestion {
    suggested: string[];
    all: string[];
}

export async function fetchPrefSuggestions(
    destination: string,
    groupSize: string
): Promise<PrefSuggestion> {
    const userMsg = `Destination: ${destination}\nGroup type: ${groupSize}\n\nWhat travel preferences should be suggested?`;

    const raw = await callAI([
        { role: "system", content: PREF_SYSTEM_PROMPT },
        { role: "user", content: userMsg },
    ]);

    const parsed = JSON.parse(raw);
    return {
        suggested: parsed.suggested ?? [],
        all: parsed.all ?? [],
    };
}
