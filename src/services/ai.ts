// ── SurakshYatra AI Service ───────────────────────────────────────────────────
// Three dedicated Gemini keys — one per concern — so each has its own quota.
// Itinerary key also handles place insights + chat (same knowledge domain).

import axios from "axios";
import type { TripPlan, PlaceDetails, ChatMessage, Activity, SafetyScore } from "../types/trip";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;
const ML_API_URL = (import.meta.env.VITE_ML_API_URL as string) || "http://localhost:8000";

// Fallback chain: specific key → legacy VITE_GEMINI_API_KEY → empty
const _fallback = (import.meta.env.VITE_GEMINI_API_KEY as string) ?? "";
const KEYS = {
    /** AI 1 — Trip preference suggestions (light, fast) */
    preferences: (import.meta.env.VITE_GEMINI_KEY_PREFERENCES as string) || _fallback,
    /** AI 2 — Itinerary generation + place insights + chat (travel knowledge) */
    itinerary: (import.meta.env.VITE_GEMINI_KEY_ITINERARY as string) || _fallback,
    /** AI 3 — Safety ML parameters + risk explanation (safety knowledge) */
    safety: (import.meta.env.VITE_GEMINI_KEY_SAFETY as string) || _fallback,
} as const;

const MODEL = "gemini-2.5-flash"; 

// ── Shared core ───────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ── Persistent cache helpers (localStorage + 24h TTL) ────────────────────────────
// localStorage survives page refreshes so users never re-fetch the same place.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function lsSet(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() }));
    } catch { /* storage full — silently ignore */ }
}

function lsGet<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { v, t } = JSON.parse(raw);
        if (Date.now() - t > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
        return v as T;
    } catch { return null; }
}

// ── Per-key rate limiter (max 10 req/min, matching Gemini free tier) ───────────────
// Queues calls and spaces them so we never exceed the RPM ceiling.
class RateLimiter {
    private queue: (() => void)[] = [];
    private timestamps: number[] = [];
    private readonly maxPerMinute: number;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(maxPerMinute = 10) { this.maxPerMinute = maxPerMinute; }

    schedule<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(() => fn().then(resolve).catch(reject));
            this.processQueue();
        });
    }

    private processQueue() {
        if (this.timer || this.queue.length === 0) return;

        const now = Date.now();
        // Drop timestamps older than 60s
        this.timestamps = this.timestamps.filter(t => now - t < 60_000);

        if (this.timestamps.length < this.maxPerMinute) {
            // Slot available — fire immediately
            const fn = this.queue.shift()!;
            this.timestamps.push(Date.now());
            fn();
            // Check queue again after a short yield
            this.timer = setTimeout(() => { this.timer = null; this.processQueue(); }, 100);
        } else {
            // All slots used — wait until the oldest slot frees up
            const oldestSlot = this.timestamps[0];
            const waitMs = 60_000 - (now - oldestSlot) + 100; // +100ms buffer
            console.warn(`⏳ [RateLimiter] Quota full (${this.maxPerMinute} RPM). Waiting ${(waitMs / 1000).toFixed(1)}s…`);
            this.timer = setTimeout(() => { this.timer = null; this.processQueue(); }, waitMs);
        }
    }
}

// One limiter per Gemini API key (each has its own independent quota)
const rateLimiters: Record<string, RateLimiter> = {};
function getLimiter(keyName: string): RateLimiter {
    if (!rateLimiters[keyName]) rateLimiters[keyName] = new RateLimiter(10);
    return rateLimiters[keyName];
}

async function callGeminiWith(
    keyName: keyof typeof KEYS,
    systemPrompt: string,
    userMessage: string,
    opts: { maxRetries?: number; temperature?: number } = {}
): Promise<string> {
    const { maxRetries = 3, temperature = 0.7 } = opts;
    const apiKey = KEYS[keyName];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    let lastError: unknown;

    // ── Schedule through per-key rate limiter ──────────────────────────────────
    return getLimiter(keyName).schedule(async () => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 16000);
                    console.log(`⏳ [AI:${keyName}] Retry ${attempt}/${maxRetries} after ${delay}ms…`);
                    await sleep(delay);
                }
                console.log(`🤖 [AI:${keyName}] Calling ${MODEL} (temp=${temperature}, attempt ${attempt + 1})…`);

                const { data } = await axios.post(
                    url,
                    {
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ role: "user", parts: [{ text: userMessage }] }],
                        generationConfig: { temperature },
                    },
                    { headers: { "Content-Type": "application/json" } }
                );

                const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                console.log(`✅ [AI:${keyName}] Response:`, raw.slice(0, 200));
                return raw;
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 429 && attempt < maxRetries) {
                    const delay = Math.min(8000 * Math.pow(2, attempt), 60000); // longer backoff on 429
                    console.warn(`⚠️ [AI:${keyName}] Rate limited (429), waiting ${delay / 1000}s…`);
                    await sleep(delay);
                    lastError = err;
                    continue;
                }
                console.warn(`⚠️ [AI:${keyName}] Failed (status ${status}):`, err?.message);
                lastError = err;
                break;
            }
        }
        throw lastError ?? new Error(`[AI:${keyName}] All retries failed`);
    });
}

/**
 * Same as callGeminiWith but enables Google Search grounding so Gemini
 * can look up live news/events before answering. Used ONLY for the
 * news-derived safety parameters where real-time accuracy matters.
 */
async function callGeminiWithGrounding(
    keyName: keyof typeof KEYS,
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = KEYS[keyName];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    console.log(`🔍 [AI:${keyName}] Calling ${MODEL} WITH Google Search grounding…`);
    try {
        const { data } = await axios.post(
            url,
            {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userMessage }] }],
                tools: [{ google_search: {} }],          // ← enables real-time search
                generationConfig: { temperature: 0.1 }, // low temp = more factual
            },
            { headers: { "Content-Type": "application/json" } }
        );

        // The grounded response may have multiple parts (text + search metadata).
        // We only need the text part that contains the JSON.
        const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
        const raw: string = parts.find((p: any) => p.text)?.text ?? "";

        const srcCount = data?.candidates?.[0]?.groundingMetadata?.groundingChunks?.length ?? 0;
        console.log(`✅ [AI:${keyName}] Grounded response (${srcCount} sources):`, raw.slice(0, 200));
        return raw;
    } catch (err: any) {
        console.warn(`⚠️ [AI:${keyName}] Grounding call failed, falling back to estimate:`, err?.message);
        // Fall back to a non-grounded call so the safety score still works
        return callGeminiWith(keyName, systemPrompt, userMessage, { temperature: 0.1 });
    }
}

// ── Named callers ────────────────────────────────────────────────────────────
// JSON callers use temperature=0.1 for deterministic output.
// Creative callers (insights, chat) use temperature=0.75.

/** AI 1 — Trip preference suggestions (JSON, strict) */
const callPreferencesAI = (sys: string, msg: string) =>
    callGeminiWith("preferences", sys, msg, { temperature: 0.1 });

/** AI 2 — Itinerary generation (JSON, strict) */
const callItineraryAI = (sys: string, msg: string) =>
    callGeminiWith("itinerary", sys, msg, { temperature: 0.2 });

/** AI 2 (same key) — Place insights + chat (creative, conversational) */
const callPlacesAI = (sys: string, msg: string) =>
    callGeminiWith("itinerary", sys, msg, { temperature: 0.75 });

/** AI 3 — Safety ML params (JSON, strict) + explanation (semi-creative) */
const callSafetyAI = (sys: string, msg: string, creative = false) =>
    callGeminiWith("safety", sys, msg, { temperature: creative ? 0.6 : 0.1 });


// ── Preference suggestions ────────────────────────────────────────────────────

const PREF_SYSTEM_PROMPT = `You are a destination intelligence engine for SurakshYatra, a travel safety app.
Given a destination city and traveller group type, rank travel preference categories by relevance for that specific destination.
Be accurate — a beach category is irrelevant for landlocked mountain cities. Spiritual is high-weight for temple/pilgrimage cities.
You MUST use ONLY these exact IDs (no others, no free text):
  popular, museum, nature, foodie, history, shopping, adventure, beach, nightlife, wellness, spiritual, trekking

Rules:
- "suggested": exactly 3 IDs most relevant to the destination+group combination
- "all": all 12 IDs ranked by relevance (most relevant first)
- Output ONLY raw JSON — no markdown fences, no explanation, no trailing text
- Respond with exactly: {"suggested":["id1","id2","id3"],"all":[...all 12 ids...]}`;

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
    const cacheKey = prefCacheKey(destination, groupSize);
    const cached = lsGet<PrefSuggestion>(cacheKey);
    if (cached) {
        console.log("✅ [AI] Loaded from cache:", cached);
        return cached;
    }

    const raw = await callPreferencesAI(
        PREF_SYSTEM_PROMPT,
        `Destination: ${destination}\nGroup: ${groupSize}`
    );

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const result: PrefSuggestion = {
        suggested: Array.isArray(parsed.suggested) ? parsed.suggested : [],
        all: Array.isArray(parsed.all) ? parsed.all : [],
    };

    console.log("📦 [AI] Final preference JSON:", result);
    lsSet(cacheKey, result);
    return result;
}

// ── Trip plan generation ──────────────────────────────────────────────────────

const TRIP_PLAN_SYSTEM = `You are SurakshYatra’s itinerary engine — a world-class AI travel planner.
Your job is to produce a realistic, safety-aware, day-by-day travel itinerary as PURE JSON (no markdown, no prose).

Strict rules:
1. Use ONLY real, well-known places for the given destination. Never invent place names.
2. Provide accurate geo_coordinates (latitude/longitude) for every activity. If unsure, use the city centre coords.
3. place_address must be a real, Google Maps-searchable address string.
4. place_details: 2-3 sentences — what the place is, why it’s worth visiting, one safety or practical tip.
5. Distribute activities to avoid geographic clustering — plan routes that make logistical sense per day.
6. ticket_pricing: give realistic price ranges in local currency where known (e.g. ₹150, Free, $5–10).
7. best_time_to_visit: give a specific time window (e.g. “8–11 AM”, “After 6 PM”).
8. Leave place_image_url as empty string "".
9. Output ONLY the JSON object — nothing before or after it.`;

const TRIP_PLAN_SCHEMA = `
Output Schema (return ONLY this JSON, no markdown, no explanation):
{
  "trip_plan": {
    "destination": "string",
    "duration": "string",
    "origin": "string",
    "budget": "string",
    "group_size": "string",
    "itinerary": [
      {
        "day": 1,
        "day_plan": "string — summary of day theme",
        "best_time_to_visit_day": "string",
        "activities": [
          {
            "place_name": "string",
            "place_details": "string — 2-3 sentences about the place",
            "place_image_url": "",
            "geo_coordinates": { "latitude": 0.0, "longitude": 0.0 },
            "place_address": "string",
            "ticket_pricing": "string",
            "time_travel_each_location": "string — e.g. 2-3 hours",
            "best_time_to_visit": "string — e.g. Morning 9-11 AM"
          }
        ]
      }
    ]
  }
}`;

function tripCacheKey(dest: string, origin: string, days: number, groupSize: string) {
    return `trip:${dest.toLowerCase()}:${origin.toLowerCase()}:${days}:${groupSize}`;
}

export async function generateTripPlan(
    destination: string,
    origin: string,
    days: number,
    groupSize: string,
    budget: string,
    prefs: string[]
): Promise<TripPlan> {
    const cacheKey = tripCacheKey(destination, origin, days, groupSize);
    const cached = lsGet<TripPlan>(cacheKey);
    if (cached) {
        console.log("✅ [AI] Trip plan from cache");
        return cached;
    }

    const userMsg = `Generate a ${days}-day travel plan from ${origin} to ${destination}.
Group type: ${groupSize}
Budget: ${budget}
Preferences: ${prefs.join(", ")}
Include ${days} days with 3-4 activities each.
Use real place names in ${destination}.
${TRIP_PLAN_SCHEMA}`;

    try {
        const raw = await callItineraryAI(TRIP_PLAN_SYSTEM, userMsg);
        const cleaned = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();

        let parsed: { trip_plan: TripPlan };
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No valid JSON in Gemini response");
            parsed = JSON.parse(jsonMatch[0]);
        }

        const plan = parsed.trip_plan;
        console.log("📦 [AI] Trip plan generated:", plan.destination, plan.itinerary?.length, "days");
        lsSet(cacheKey, plan);
        return plan;
    } catch (err) {
        console.warn("⚠️ [AI] Using fallback trip plan due to error:", err);
        return buildFallbackPlan(destination, origin, days, groupSize, budget);
    }
}

// ── Fallback plan (shown when Gemini is unavailable) ──────────────────────────

function buildFallbackPlan(dest: string, origin: string, days: number, group: string, budget: string): TripPlan {
    const samplePlaces = [
        { name: "City Centre Market", details: `A bustling local market showcasing the best street food, crafts, and culture of ${dest}.`, address: `City Centre, ${dest}`, pricing: "Free entry", time: "2–3 hours", best: "Morning" },
        { name: "National Museum", details: `Explore centuries of history and art at this world-class museum in the heart of ${dest}.`, address: `Museum District, ${dest}`, pricing: "$5–15", time: "2 hours", best: "10 AM–12 PM" },
        { name: "Historic Old Town", details: "Walk through charming cobblestoned streets lined with heritage buildings and local cafes.", address: `Old Town, ${dest}`, pricing: "Free", time: "1–2 hours", best: "Afternoon" },
        { name: "Scenic Viewpoint", details: `Breathtaking panoramic views of ${dest} from this popular hilltop.`, address: `Hillside Park, ${dest}`, pricing: "Free", time: "1 hour", best: "Sunrise / Sunset" },
        { name: "Local Food Street", details: "Savour authentic local cuisine at this famous food street packed with vendors and restaurants.", address: `Food Street, ${dest}`, pricing: "$2–10 per dish", time: "1.5 hours", best: "Evening" },
        { name: "Heritage Landmark", details: `A spiritual and architectural gem that embodies the cultural soul of ${dest}.`, address: `Heritage Zone, ${dest}`, pricing: "Free–$3", time: "1.5 hours", best: "Morning" },
        { name: "Night Market", details: `Experience the vibrant nightlife of ${dest} with street food, souvenirs, and local performers.`, address: `Night Market, ${dest}`, pricing: "Free entry", time: "2 hours", best: "7–10 PM" },
        { name: "Botanical Garden", details: "A peaceful retreat with exotic plants and manicured gardens.", address: `Garden District, ${dest}`, pricing: "$2–8", time: "1.5 hours", best: "Late morning" },
    ];

    const itinerary = Array.from({ length: days }, (_, d) => ({
        day: d + 1,
        day_plan: d === 0 ? "Arrival & city highlights" : d === days - 1 ? "Final exploration & departure" : "Deep dive into local culture",
        best_time_to_visit_day: "Start at 9 AM",
        activities: [0, 1, 2].map((i) => {
            const p = samplePlaces[(d * 3 + i) % samplePlaces.length];
            return {
                place_name: p.name,
                place_details: p.details,
                place_image_url: "",
                geo_coordinates: { latitude: 0, longitude: 0 },
                place_address: p.address,
                ticket_pricing: p.pricing,
                time_travel_each_location: p.time,
                best_time_to_visit: p.best,
            };
        }),
    }));

    return { destination: dest, duration: `${days} days`, origin, budget, group_size: group, itinerary };
}

// ── Places API (New) — place search + review summary ─────────────────────────

/**
 * Search for a place by name using Places Text Search (New).
 * Returns place ID, review summary, photos, hours, rating etc.
 */
export async function fetchPlaceDetails(
    placeName: string,
    _address: string,
    destination: string
): Promise<PlaceDetails | null> {
    const query = `${placeName} ${destination}`;

    try {
        const searchRes = await axios.post(
            `https://places.googleapis.com/v1/places:searchText`,
            { textQuery: query, maxResultCount: 1 },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": MAPS_API_KEY,
                    "X-Goog-FieldMask": [
                        "places.id",
                        "places.displayName",
                        "places.rating",
                        "places.userRatingCount",
                        "places.formattedAddress",
                        "places.googleMapsUri",
                        "places.regularOpeningHours",
                        "places.photos",
                        "places.reviewSummary",
                        "places.websiteUri",
                    ].join(","),
                },
            }
        );

        const place = searchRes.data?.places?.[0];
        if (!place) return null;

        console.log(`✅ [Places] Found: ${place.displayName?.text}`, place.reviewSummary ? "(has review summary)" : "(no review summary)");

        return {
            placeId: place.id,
            displayName: place.displayName,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            formattedAddress: place.formattedAddress,
            googleMapsUri: place.googleMapsUri,
            regularOpeningHours: place.regularOpeningHours,
            photos: place.photos,
            reviewSummary: place.reviewSummary,
            websiteUri: place.websiteUri,
        } as PlaceDetails;
    } catch (err) {
        console.warn("⚠️ [Places] Search failed:", err);
        return null;
    }
}

/**
 * Fetch a photo URL from Google Places photo resource name.
 */
export function getPlacePhotoUrl(photoName: string, maxWidth = 600): string {
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${MAPS_API_KEY}`;
}

// ── AI traveller insights ────────────────────────────────────────────────────

const INSIGHTS_SYSTEM = `You are a local travel expert writing practical tips for SurakshYatra travelers.
Given the place name, destination city, and a brief description, write EXACTLY 5 bullet points.
Each bullet must cover one of: what to expect on arrival, the must-see highlight, a safety/awareness tip, best time or photo spot, local custom / dress code.
Rules:
- Start every bullet with the • character followed by a space
- One sentence per bullet. Be specific to THIS place, not generic travel advice.
- No headings, no bold, no markdown, no numbered list. Just 5 • lines.
- Mention the actual place name in at least 2 bullets for specificity.`;

export async function generatePlaceInsights(
    placeName: string,
    placeDetails: string,
    destination: string
): Promise<string> {
    const cacheKey = `insights:${placeName.toLowerCase()}:${destination.toLowerCase()}`;
    const cached = lsGet<string>(cacheKey);
    if (cached) return cached;

    try {
        const raw = await callPlacesAI(
            INSIGHTS_SYSTEM,
            `Place: ${placeName}\nDestination: ${destination}\nDetails: ${placeDetails}`
        );
        const text = raw.trim();
        lsSet(cacheKey, text);
        return text;
    } catch {
        return "• Great place for first-time visitors — arrive early to avoid crowds.\n• Carry small cash for entry fees and nearby vendors.\n• Respect local customs and dress codes at religious or heritage sites.\n• Best photos in the morning or golden hour near sunset.\n• Keep your belongings secure in busy tourist areas.";
    }
}

// ── Chat assistant ────────────────────────────────────────────────────────────

const CHAT_SYSTEM = `You are SurakshYatra’s AI trip assistant — a friendly, knowledgeable travel safety guide.
You have full context of the user’s planned trip (destination, days, group type, itinerary).
Your role:
- Answer questions about the trip, local safety, transport, food, weather, culture, costs, and logistics.
- If asked about safety: give honest, practical, specific advice — not generic warnings.
- Stay on-topic to travel. If the user asks something unrelated, gently redirect.
- Reply in 2–4 sentences max unless more detail is explicitly requested.
- Be warm, concise, and confident. Never say "I don’t know" — give your best informed answer.
- Use the trip context to personalise answers (e.g. reference actual places in their itinerary).`;

export async function generateChatResponse(
    messages: ChatMessage[],
    tripContext: string
): Promise<string> {
    const conversation = messages
        .map((m) => `${m.role === "user" ? "User" : "SurakshYatra"}: ${m.text}`)
        .join("\n");

    const userMsg = `Trip Context:\n${tripContext}\n\nConversation:\n${conversation}\n\nSurakshYatra:`;
    try {
        const raw = await callPlacesAI(CHAT_SYSTEM, userMsg);
        return raw.replace(/^SurakshYatra:\s*/i, "").trim();
    } catch {
        return "I'm having trouble connecting right now. Please try again in a moment.";
    }
}

// ── Geocode a place name to coordinates ──────────────────────────────────────

export async function geocodePlace(
    placeName: string,
    destination: string
): Promise<{ lat: number; lng: number } | null> {
    try {
        const { data } = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json`,
            { params: { address: `${placeName}, ${destination}`, key: MAPS_API_KEY } }
        );
        const loc = data?.results?.[0]?.geometry?.location;
        if (loc) return { lat: loc.lat, lng: loc.lng };
    } catch { /* silent */ }
    return null;
}

// ── Activity helper — resolve coords if AI gave 0,0 ──────────────────────────

export async function resolveActivityCoords(
    activity: Activity,
    destination: string
): Promise<Activity> {
    const { latitude, longitude } = activity.geo_coordinates;
    if (latitude !== 0 && longitude !== 0) return activity;

    const resolved = await geocodePlace(activity.place_name, destination);
    if (resolved) {
        return {
            ...activity,
            geo_coordinates: { latitude: resolved.lat, longitude: resolved.lng },
        };
    }
    return activity;
}

// ── Generate a single activity for "Add a place" ─────────────────────────────

const SINGLE_ACTIVITY_SYSTEM = `You are a travel planner. Given a place name and destination city, return a single JSON activity object with no markdown fences and no extra text. Use real coordinates for the place.`;

export async function generateSingleActivity(
    placeName: string,
    destination: string
): Promise<Activity> {
    const schema = `{ "place_name": "...", "place_details": "...", "place_image_url": "", "geo_coordinates": { "latitude": 0.0, "longitude": 0.0 }, "place_address": "...", "ticket_pricing": "...", "time_travel_each_location": "...", "best_time_to_visit": "..." }`;

    try {
        const raw = await callItineraryAI(
            SINGLE_ACTIVITY_SYSTEM,
            `Place: ${placeName}\nDestination: ${destination}\nReturn ONLY this JSON filled in with real data: ${schema}`
        );
        const cleaned = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const activity: Activity = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        return resolveActivityCoords(activity, destination);
    } catch {
        const coords = await geocodePlace(placeName, destination);
        return {
            place_name: placeName,
            place_details: `A noteworthy place in ${destination}.`,
            place_image_url: "",
            geo_coordinates: { latitude: coords?.lat ?? 0, longitude: coords?.lng ?? 0 },
            place_address: destination,
            ticket_pricing: "Check on site",
            time_travel_each_location: "1-2 hours",
            best_time_to_visit: "Morning",
        };
    }
}

// ── Safety Score — Gemini → FastAPI ML pipeline ───────────────────────────────

// ── Call 1: Structural estimates (no grounding needed) ────────────────────────
// These are fairly stable, knowledge-based fields that Gemini can estimate well
// from its training data without needing live news.
const SAFETY_STRUCTURAL_PROMPT = (
    place_name: string,
    place_category: string,
    location_type: string,
    traveler_type: string,
    preferred_time: string
) => `You are a travel safety analyst AI. Given a place, estimate stable safety parameters for an ML model.

Place: ${place_name}
Category: ${place_category}
Location type: ${location_type}
Traveler type: ${traveler_type}
Preferred visit time: ${preferred_time}

Return ONLY a valid JSON object with these exact fields (no explanation, no markdown):
{
  "population_density": <0.0-1.0>,
  "crime_rate": <0.0-1.0>,
  "lighting_conditions": <0.0-1.0>,
  "security_personnel": <0.0-1.0>,
  "emergency_services_proximity": <0.0-1.0>,
  "local_transport_accessibility": <0.0-1.0>,
  "infrastructure_quality": <0.0-1.0>,
  "natural_disaster_risk": <0.0-1.0>,
  "political_stability": <0.0-1.0>,
  "health_facilities_access": <0.0-1.0>,
  "tourist_attraction": <0.0-1.0>,
  "local_awareness_score": <0.0-1.0>,
  "community_engagement": <0.0-1.0>,
  "cultural_sensitivity": <0.0-1.0>,
  "communication_infrastructure": <0.0-1.0>,
  "environmental_hazards": <0.0-1.0>,
  "public_perception_score": <0.0-1.0>,
  "economic_stability": <0.0-1.0>,
  "regulatory_compliance": <0.0-1.0>,
  "local_support_network": <0.0-1.0>,
  "negative_review_ratio": <0.0-1.0>,
  "temperature_c": <number>,
  "rainfall_mm": <number>,
  "wind_speed_kmh": <number>,
  "air_quality_index": <0-500>,
  "flood_alert": <0 or 1>,
  "wildfire_alert": <0 or 1>,
  "environmental_alert": <0 or 1>,
  "extreme_weather_alert": <0 or 1>,
  "place_rating": <1.0-5.0>,
  "hospital_distance_km": <number>
}`;

// ── Call 2: News-derived signals (WITH Google Search grounding) ───────────────
// These 7 fields change daily and need real live-news awareness.
// Gemini will search the web before answering, using real current information.
export interface GroundedNewsSignals {
    protest: 0 | 1;
    vip_security_flag: 0 | 1;
    event_crowd_signal: 0 | 1;
    news_risk_keywords: 0 | 1;
    cultural_disruption: 0 | 1;
    social_unrest_indicators: number;  // 0.0-1.0
    crowd_level: number;               // 0.0-1.0
    historical_incidents: number;      // 0.0-1.0
    grounded: boolean;                 // true = real search was used
}

const GROUNDED_NEWS_SYSTEM = `You are a real-time travel safety analyst.
Search for the latest news about the destination provided and assess current ground-level conditions.
Return ONLY a valid JSON object — no markdown, no explanation.`;

const GROUNDED_NEWS_PROMPT = (place_name: string, traveler_type: string) =>
    `Search for the CURRENT news, events, and conditions at: "${place_name}".
Traveler type: ${traveler_type}

Based on what you find from the web RIGHT NOW, return ONLY this JSON:
{
  "protest": <1 if any protest/strike/bandh is currently reported near this location, else 0>,
  "vip_security_flag": <1 if a VIP/VVIP/politician/celebrity visit is reported in the area, else 0>,
  "event_crowd_signal": <1 if a festival, concert, pilgrimage rush, or major event is ongoing, else 0>,
  "news_risk_keywords": <1 if any riot/stampede/violence/restriction/closure news found, else 0>,
  "cultural_disruption": <1 if there is a reported cultural clash, religious tension, or community unrest, else 0>,
  "social_unrest_indicators": <0.0-1.0 — overall score of social tension from news>,
  "crowd_level": <0.0-1.0 — how crowded is this place right now based on news/events>,
  "historical_incidents": <0.0-1.0 — recent safety incidents reported in the last few weeks>
}

If no relevant news is found for a field, default it to 0.
Return ONLY the JSON object, nothing else.`;

// ── Fetch grounded news signals for a destination ────────────────────────────
export async function fetchGroundedNewsSignals(
    placeName: string,
    travelerType: string
): Promise<GroundedNewsSignals> {
    const fallback: GroundedNewsSignals = {
        protest: 0, vip_security_flag: 0, event_crowd_signal: 0,
        news_risk_keywords: 0, cultural_disruption: 0,
        social_unrest_indicators: 0.1, crowd_level: 0.5, historical_incidents: 0.2,
        grounded: false,
    };

    try {
        const raw = await callGeminiWithGrounding(
            "safety",
            GROUNDED_NEWS_SYSTEM,
            GROUNDED_NEWS_PROMPT(placeName, travelerType)
        );
        const cleaned = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
        const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned);
        console.log(`📰 [Safety] Grounded news signals for "${placeName}": protest=${parsed.protest}, crowd=${parsed.crowd_level}, vip=${parsed.vip_security_flag}`);
        return { ...fallback, ...parsed, grounded: true };
    } catch (err: any) {
        console.warn(`⚠️ [Safety] Grounded news fetch failed for "${placeName}", using defaults:`, err?.message);
        return fallback;
    }
}

export async function fetchSafetyScore(
    placeName: string,
    placeCategory: string,
    locationType: string,
    travelerType: string,
    preferredTime: string
): Promise<SafetyScore | null> {
    const cacheKey = `safety:${placeName.toLowerCase()}:${travelerType}:${preferredTime}`;
    const cached = lsGet<SafetyScore>(cacheKey);
    if (cached) {
        console.log(`✅ [Safety] Score for "${placeName}" from cache`);
        return cached;
    }

    try {
        // ── Step 1a & 1b: Run structural estimate + live news search IN PARALLEL ─
        // Structural: stable parameters Gemini knows from training (crime, infra, etc.)
        // Grounded:   live news signals fetched via Google Search (protest, VIP, etc.)
        console.log(`🛡️ [Safety] Starting parallel fetch for "${placeName}"…`);
        const [structuralRaw, newsSignals] = await Promise.all([
            callSafetyAI(
                "You are a travel safety analyst. Return ONLY a valid JSON object, no markdown, no explanation.",
                SAFETY_STRUCTURAL_PROMPT(placeName, placeCategory, locationType, travelerType, preferredTime)
            ),
            fetchGroundedNewsSignals(placeName, travelerType),
        ]);

        // Parse structural params
        const cleanedStructural = structuralRaw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
        let structuralParams: Record<string, number | string>;
        try {
            structuralParams = JSON.parse(cleanedStructural);
        } catch {
            const match = cleanedStructural.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("Gemini returned invalid JSON for structural params");
            structuralParams = JSON.parse(match[0]);
        }

        // ── Step 2: Merge — grounded news values OVERRIDE structural estimates ──
        // This ensures live protest/VIP/crowd signals are always used when available.
        const geminiParams: Record<string, number | string> = {
            ...structuralParams,
            // Override with live-searched values (or keep structural fallback if grounding failed)
            protest: newsSignals.protest,
            vip_security_flag: newsSignals.vip_security_flag,
            event_crowd_signal: newsSignals.event_crowd_signal,
            news_risk_keywords: newsSignals.news_risk_keywords,
            cultural_disruption: newsSignals.cultural_disruption,
            social_unrest_indicators: newsSignals.social_unrest_indicators,
            crowd_level: newsSignals.crowd_level,
            historical_incidents: newsSignals.historical_incidents,
        };

        console.log(`🔀 [Safety] Merged params — grounded=${newsSignals.grounded}, protest=${geminiParams.protest}, crowd=${geminiParams.crowd_level}`);

        // ── Step 3: Send merged payload to FastAPI ML model ───────────────────
        const payload = {
            place_name: placeName,
            place_category: placeCategory,
            location_type: locationType,
            traveler_type: travelerType,
            preferred_time: preferredTime,
            mobility: "walking",
            weather_conditions: "clear",
            ...geminiParams,
        };

        const res = await axios.post(`${ML_API_URL}/predict`, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
        });

        const result: SafetyScore = {
            ...res.data,
            gemini_params: geminiParams,
            live_news_used: newsSignals.grounded,
        };

        lsSet(cacheKey, result);
        console.log(`🛡️ [Safety] ${placeName}: ${result.safety_level} (${result.safety_score}) | live_news=${result.live_news_used}`);
        return result;
    } catch (err: any) {
        console.warn(`⚠️ [Safety] Could not fetch safety score for "${placeName}":`, err?.message ?? err);
        return null;
    }
}

// ── Safety Explanation — Gemini explains WHY a place is risky ─────────────────

const SAFETY_EXPLAIN_SYSTEM = `You are a travel safety analyst for SurakshYatra.
Given a place name, its safety classification, and a set of risk/safety parameter values, write exactly 3 bullet points about this place for a traveler.

Rules:
- Write EXACTLY 3 bullet points starting with •
- If safety_level is "Safe": highlight the specific POSITIVE safety factors (e.g. low crime, good lighting, strong security, easy hospital access). Be specific, not generic.
- If safety_level is "Moderate" or "Risky": explain the specific risk factors tied to the parameter values.
- Be honest but not alarmist. Mention the actual place name in at least one bullet.
- Plain sentences only. No headings, no bold, no markdown. Just 3 • lines.`;

export async function generateSafetyExplanation(
    placeName: string,
    safetyLevel: "Safe" | "Moderate" | "Risky",
    geminiParams: Record<string, number | string>
): Promise<string> {
    const cacheKey = `safety-explain:${placeName.toLowerCase()}:${safetyLevel}`;
    const cached = lsGet<string>(cacheKey);
    if (cached) return cached;

    // Pick the most relevant parameters for each level
    const safetyKeys = safetyLevel === "Safe"
        ? ["security_personnel", "lighting_conditions", "political_stability", "health_facilities_access",
            "emergency_services_proximity", "regulatory_compliance", "community_engagement", "place_rating"]
        : ["crime_rate", "natural_disaster_risk", "social_unrest_indicators",
            "environmental_hazards", "historical_incidents", "protest", "flood_alert",
            "wildfire_alert", "extreme_weather_alert", "environmental_alert",
            "news_risk_keywords", "negative_review_ratio", "lighting_conditions",
            "security_personnel", "air_quality_index"];

    const riskFactors = Object.entries(geminiParams)
        .filter(([key]) => safetyKeys.includes(key))
        .map(([key, val]) => `${key}: ${val}`)
        .join(", ");

    const userMsg = `Place: ${placeName}
Safety Level: ${safetyLevel}
Key parameters: ${riskFactors}

Write 3 bullet points explaining why this place is rated ${safetyLevel} for travelers.`;

    try {
        const raw = await callSafetyAI(SAFETY_EXPLAIN_SYSTEM, userMsg, true);
        const text = raw.trim();
        lsSet(cacheKey, text);
        return text;
    } catch {
        if (safetyLevel === "Safe") {
            return `• ${placeName} has low reported crime rates and visible security presence, making it well-suited for most traveler types.\n• Good lighting conditions and accessible emergency services contribute to a safe visit experience.\n• Strong community engagement and regulatory compliance help maintain a welcoming environment for tourists.`;
        }
        return safetyLevel === "Risky"
            ? "• Exercise caution in this area due to elevated risk factors.\n• Check local advisories before visiting.\n• Avoid travelling alone, especially at night."
            : "• Some safety concerns exist — stay aware of your surroundings.\n• Keep valuables secure and avoid isolated areas.\n• Follow local guidance and stay in well-populated zones.";
    }
}

