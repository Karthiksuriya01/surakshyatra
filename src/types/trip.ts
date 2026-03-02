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
