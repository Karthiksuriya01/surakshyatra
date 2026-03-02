// ── SurakshYatra AI Service ───────────────────────────────────────────────────
// Uses axios to call the Gemini REST API directly (Google AI Studio key).
// API key is read from .env (VITE_GEMINI_API_KEY).

import axios from "axios";
import type { TripPlan, PlaceDetails, ChatMessage, Activity } from "../types/trip";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

const MODELS = ["gemini-3-flash-preview"] as const;

// ── Core helper ───────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callGemini(systemPrompt: string, userMessage: string, maxRetries = 3): Promise<string> {
    let lastError: unknown;

    for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 16000);
                    console.log(`⏳ [AI] Retry ${attempt}/${maxRetries} after ${delay}ms…`);
                    await sleep(delay);
                }
                console.log(`🤖 [AI] Trying ${model} (attempt ${attempt + 1})…`);

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
                console.log(`✅ [AI] Response from ${model}:`, raw.slice(0, 200));
                return raw;
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 429 && attempt < maxRetries) {
                    console.warn(`⚠️ [AI] Rate limited (429), will retry…`);
                    lastError = err;
                    continue;
                }
                console.warn(`⚠️ [AI] ${model} failed (status ${status}):`, err?.message);
                lastError = err;
                break;
            }
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

// ── Trip plan generation ──────────────────────────────────────────────────────

const TRIP_PLAN_SYSTEM = `You are SurakshYatra, a professional AI travel planner. Generate a detailed travel itinerary in strict JSON format with no markdown or code fences. Use only real place names, real addresses, and realistic coordinates. If you don't have exact image URLs use empty string "". Return only valid JSON.`;

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
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached) as TripPlan;
            console.log("✅ [AI] Trip plan from cache");
            return parsed;
        } catch { /* ignore */ }
    }

    const userMsg = `Generate a ${days}-day travel plan from ${origin} to ${destination}.
Group type: ${groupSize}
Budget: ${budget}
Preferences: ${prefs.join(", ")}
Include ${days} days with 3-4 activities each.
Use real place names in ${destination}.
${TRIP_PLAN_SCHEMA}`;

    try {
        const raw = await callGemini(TRIP_PLAN_SYSTEM, userMsg);
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
        sessionStorage.setItem(cacheKey, JSON.stringify(plan));
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

// ── AI traveller insights (bullet points) ────────────────────────────────────

const INSIGHTS_SYSTEM = `You are a knowledgeable travel guide specialising in safety, culture and practical tips. Given a place name and its details, return exactly 4-5 concise bullet points for a first-time traveller. Cover: what to expect, local tips, safety considerations, best photo spots or timing, and cultural etiquette. Format each bullet EXACTLY like: "• [tip]" — one per line. No headings, no extra text, just the bullet lines.`;

export async function generatePlaceInsights(
    placeName: string,
    placeDetails: string,
    destination: string
): Promise<string> {
    const cacheKey = `insights:${placeName.toLowerCase()}:${destination.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    try {
        const raw = await callGemini(
            INSIGHTS_SYSTEM,
            `Place: ${placeName}\nDestination: ${destination}\nDetails: ${placeDetails}`
        );
        const text = raw.trim();
        sessionStorage.setItem(cacheKey, text);
        return text;
    } catch {
        return "• Great place for first-time visitors — arrive early to avoid crowds.\n• Carry small cash for entry fees and nearby vendors.\n• Respect local customs and dress codes at religious or heritage sites.\n• Best photos in the morning or golden hour near sunset.\n• Keep your belongings secure in busy tourist areas.";
    }
}

// ── Chat assistant ────────────────────────────────────────────────────────────

const CHAT_SYSTEM = `You are SurakshYatra, an expert AI travel safety guide and trip planner. You have access to the user's current trip context below. Answer the user's questions about their trip, local safety, weather, cultural tips, nearby attractions, food, transport, or anything else travel-related. Be concise, helpful and friendly. If asked about safety, give practical, honest advice.`;

export async function generateChatResponse(
    messages: ChatMessage[],
    tripContext: string
): Promise<string> {
    const conversation = messages
        .map((m) => `${m.role === "user" ? "User" : "SurakshYatra"}: ${m.text}`)
        .join("\n");

    const userMsg = `Trip Context:\n${tripContext}\n\nConversation:\n${conversation}\n\nSurakshYatra:`;
    try {
        const raw = await callGemini(CHAT_SYSTEM, userMsg);
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
        const raw = await callGemini(
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
