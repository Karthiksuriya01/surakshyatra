import { useState, useEffect, useRef } from "react";
import { Wrap, BackBtn } from "../components/ui";
import type { Destination } from "../constants/data";
import { fetchPrefSuggestions } from "../utils/ai";
import type { GroupSize } from "./S2b_GroupDuration";

// ── Extended preference list (AI can suggest anything from this pool) ──────────

const ALL_PREFS: { id: string; label: string; emoji: string }[] = [
    { id: "popular", label: "Popular", emoji: "👍" },
    { id: "museum", label: "Museum", emoji: "🏛️" },
    { id: "nature", label: "Nature", emoji: "🌿" },
    { id: "foodie", label: "Foodie", emoji: "🍕" },
    { id: "history", label: "History", emoji: "🏺" },
    { id: "shopping", label: "Shopping", emoji: "🛍️" },
    { id: "adventure", label: "Adventure", emoji: "🧗" },
    { id: "beach", label: "Beach", emoji: "🏖️" },
    { id: "nightlife", label: "Nightlife", emoji: "🎶" },
    { id: "wellness", label: "Wellness", emoji: "🧘" },
    { id: "spiritual", label: "Spiritual", emoji: "🕌" },
    { id: "trekking", label: "Trekking", emoji: "🥾" },
];

interface Props {
    dest: Destination;
    groupSize: GroupSize;
    days: number;
    onNext: (prefs: string[]) => void;
    onBack: () => void;
}

export default function S2_Preferences({ dest, groupSize, days, onNext, onBack }: Props) {
    const [sel, setSel] = useState<string[]>([]);
    const [orderedPrefs, setOrderedPrefs] = useState(ALL_PREFS);
    const [aiSuggested, setAiSuggested] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiError, setAiError] = useState(false);
    const called = useRef(false);

    const toggle = (id: string) =>
        setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    useEffect(() => {
        if (called.current) return;
        called.current = true;

        fetchPrefSuggestions(dest.main, groupSize)
            .then((res) => {
                // Reorder chips: AI-ordered first, then the rest
                const ordered = [
                    ...res.all.map((id) => ALL_PREFS.find((p) => p.id === id)!).filter(Boolean),
                    ...ALL_PREFS.filter((p) => !res.all.includes(p.id)),
                ];
                setOrderedPrefs(ordered);
                setAiSuggested(res.suggested);
                setSel(res.suggested.slice(0, 3)); // pre-select top 3 suggestions
            })
            .catch(() => {
                // Fallback: just select "popular"
                setAiError(true);
                setSel(["popular"]);
            })
            .finally(() => setLoading(false));
    }, [dest.main, groupSize]);

    return (
        <Wrap>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px", animation: "fadeUp 0.6s ease both" }}>
                <BackBtn onClick={onBack} />
                <div style={{ marginTop: 28, marginBottom: 28 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 30, padding: "6px 14px", fontSize: 12, color: "#c084fc", fontWeight: 500, marginBottom: 16 }}>📍 {dest.main}</div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👍</div>
                    <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>Trip Preferences</h1>
                    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 15 }}>What should your {days}-day trip be about?</p>
                </div>

                {/* AI status banner */}
                {loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(192,132,252,0.3)", borderTopColor: "#c084fc", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>AI is personalising preferences for <strong style={{ color: "#c084fc" }}>{dest.main}</strong>…</span>
                    </div>
                ) : !aiError ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                        <span style={{ fontSize: 16 }}>✨</span>
                        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>AI suggested preferences for <strong style={{ color: "#10b981" }}>{dest.main}</strong> based on your group</span>
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                        <span style={{ fontSize: 16 }}>⚠️</span>
                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Couldn't reach AI — showing default preferences</span>
                    </div>
                )}

                {/* Chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24, minHeight: 50 }}>
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} style={{ height: 38, width: 100 + (i % 3) * 20, borderRadius: 20, background: "rgba(255,255,255,0.05)", animation: `pulse 1.4s ease ${i * 0.15}s infinite` }} />
                        ))
                        : orderedPrefs.map((p) => {
                            const isSelected = sel.includes(p.id);
                            const isAI = aiSuggested.includes(p.id);
                            return (
                                <button
                                    key={p.id}
                                    className={`pref-chip ${isSelected ? "selected" : ""}`}
                                    onClick={() => toggle(p.id)}
                                    style={{ position: "relative" }}
                                >
                                    {p.emoji} {p.label}
                                    {isAI && !isSelected && (
                                        <span style={{ marginLeft: 4, fontSize: 10, color: "#c084fc", opacity: 0.7 }}>✦</span>
                                    )}
                                    {isSelected && <span style={{ color: "#c084fc", fontSize: 12, marginLeft: 4 }}>✓</span>}
                                </button>
                            );
                        })}
                </div>

                {/* Selected summary */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px", marginBottom: 28 }}>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>Selected</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {sel.length === 0
                            ? <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 13 }}>None selected</span>
                            : sel.map((id) => {
                                const p = ALL_PREFS.find((x) => x.id === id);
                                if (!p) return null;
                                return (
                                    <span key={id} style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#c084fc" }}>
                                        {p.emoji} {p.label}
                                    </span>
                                );
                            })}
                    </div>
                </div>

                <button className="btn-primary" disabled={sel.length === 0 || loading} onClick={() => onNext(sel)}>
                    {loading ? "Loading…" : "Continue →"}
                </button>
            </div>
        </Wrap>
    );
}
