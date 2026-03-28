// ── Shared trip types used across pages and services ─────────────────────────

export type GroupSize = "solo" | "couple" | "family" | "friends";

export interface SourcePlace {
    placeId: string;
    main: string;
    secondary: string;
    emoji: string;
    lat?: number;
    lng?: number;
}

// ── AI-generated trip plan types ──────────────────────────────────────────────

export interface Activity {
    place_name: string;
    place_details: string;
    place_image_url: string;
    geo_coordinates: { latitude: number; longitude: number };
    place_address: string;
    ticket_pricing: string;
    time_travel_each_location: string;
    best_time_to_visit: string;
}

export interface ItineraryDay {
    day: number;
    day_plan: string;
    best_time_to_visit_day: string;
    activities: Activity[];
}

export interface TripPlan {
    destination: string;
    duration: string;
    origin: string;
    budget: string;
    group_size: string;
    itinerary: ItineraryDay[];
}

// ── Google Places API (New) review summary ────────────────────────────────────

export interface PlaceReviewSummary {
    text: { text: string; languageCode: string };
    flagContentUri: string;
    disclosureText: { text: string; languageCode: string };
    reviewsUri: string;
}

export interface PlaceDetails {
    displayName?: { text: string };
    reviewSummary?: PlaceReviewSummary;
    rating?: number;
    userRatingCount?: number;
    formattedAddress?: string;
    websiteUri?: string;
    photos?: { name: string }[];
    regularOpeningHours?: {
        openNow?: boolean;
        weekdayDescriptions?: string[];
    };
    googleMapsUri?: string;
    placeId?: string; // resolved place ID
}

// ── Chat message ──────────────────────────────────────────────────────────────

export interface ChatMessage {
    role: "user" | "assistant";
    text: string;
}

// ── Safety score (ML model result) ────────────────────────────────────────────

export interface SafetyScore {
    place_name: string;
    safety_level: "Safe" | "Moderate" | "Risky";
    safety_score: number;       // 0-100 (weighted: safe=100%, moderate=65%, risky=0%)
    confidence: {
        safe: number;
        moderate: number;
        risky: number;
    };
    gemini_params?: Record<string, number | string>; // raw ML features for explanation
    disclaimer?: string;        // "AI-estimated — not sourced from real-time databases"
    live_news_used?: boolean;   // true = grounded Google Search was used for news fields
}

