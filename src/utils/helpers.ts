import { DESTINATIONS, PLACE_POOL } from "../constants/data";
import type { Destination, Place } from "../constants/data";

// ── Destination search ────────────────────────────────────────────────────────

export function searchDestinations(q: string): Destination[] {
    if (q.trim().length < 1) return [];
    const lower = q.toLowerCase();
    return DESTINATIONS.filter(
        (d) =>
            d.main.toLowerCase().includes(lower) ||
            d.secondary.toLowerCase().includes(lower)
    ).slice(0, 6);
}

// ── Itinerary generator ───────────────────────────────────────────────────────

export interface DayItinerary {
    day: number;
    places: Place[];
}

export function generateItinerary(days: number, preferences: string[]): DayItinerary[] {
    const pool: Place[] = [];
    preferences.forEach((p) => {
        if (PLACE_POOL[p]) pool.push(...PLACE_POOL[p]);
    });
    if (pool.length === 0) pool.push(...PLACE_POOL.popular);
    const unique = pool.filter(
        (p, i, a) => a.findIndex((x) => x.name === p.name) === i
    );
    return Array.from({ length: days }, (_, d) => ({
        day: d + 1,
        places: [0, 1, 2].map((i) => unique[(d * 3 + i) % unique.length]),
    }));
}

// ── Safety colour helper ──────────────────────────────────────────────────────

export interface SafetyStyle {
    color: string;
    label: string;
    bg: string;
}

export function sc(score: number): SafetyStyle {
    if (score >= 85) return { color: "#10b981", label: "Very Safe", bg: "rgba(16,185,129,0.12)" };
    if (score >= 70) return { color: "#f59e0b", label: "Mostly Safe", bg: "rgba(245,158,11,0.12)" };
    return { color: "#ef4444", label: "Caution", bg: "rgba(239,68,68,0.12)" };
}
