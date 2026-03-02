import { useState, useEffect } from "react";
import { Wrap, Logo, BackBtn } from "../components/ui";
import { generateItinerary, sc } from "../utils/helpers";
import type { DayItinerary } from "../utils/helpers";
import type { Destination, Place } from "../constants/data";
import type { SourcePlace, GroupSize } from "../types/trip";

const GROUP_EMOJI: Record<string, string> = { solo: "🧍", couple: "👫", family: "👨‍👩‍👧‍👦", friends: "👯" };

interface Props {
    dest: Destination;
    prefs: string[];
    days: number;
    groupSize?: GroupSize;
    source?: SourcePlace | null;
    onPlace: (place: Place) => void;
    onBack: () => void;
}

export default function Itinerary({ dest, prefs, days, groupSize, source, onPlace, onBack }: Props) {
    const [activeDay, setActiveDay] = useState(1);
    const [loading, setLoading] = useState(true);
    const [itinerary, setItinerary] = useState<DayItinerary[]>([]);

    useEffect(() => {
        const t = setTimeout(() => { setItinerary(generateItinerary(days, prefs)); setLoading(false); }, 1800);
        return () => clearTimeout(t);
    }, []);

    if (loading) {
        return (
            <Wrap>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20, padding: "24px", textAlign: "center" }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", border: "3px solid rgba(192,132,252,0.2)", borderTopColor: "#c084fc", animation: "spin 0.9s linear infinite" }} />
                    <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>Generating your itinerary</h2>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, maxWidth: 280 }}>Personalising trip to <strong style={{ color: "#c084fc" }}>{dest.main}</strong> with safety scores…</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                        {["Analysing places", "Checking safety", "Building routes"].map((label, i) => (
                            <span key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.4)", animation: `pulse 1.5s ease ${i * 0.4}s infinite` }}>{label}</span>
                        ))}
                    </div>
                </div>
            </Wrap>
        );
    }

    const dayData = itinerary.find((d) => d.day === activeDay);

    return (
        <Wrap>
            <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px", animation: "fadeIn 0.5s ease both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                    <BackBtn onClick={onBack} />
                    <Logo small />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{dest.main}</h1>
                    {source && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "4px 12px" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{source.emoji} {source.main}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{dest.emoji ?? "📍"} {dest.main}</span>
                        </div>
                    )}
                    <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, marginTop: 3 }}>{days}-day trip · AI-curated with safety scores</p>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
                    {[
                        { icon: "📍", val: `${days * 3}+`, lbl: "Places" },
                        { icon: "🛡️", val: "84", lbl: "Avg Safety" },
                        { icon: "📅", val: `${days}`, lbl: "Days" },
                        { icon: GROUP_EMOJI[groupSize ?? "solo"] ?? "🧍", val: groupSize ? groupSize.charAt(0).toUpperCase() + groupSize.slice(1) : "Solo", lbl: "Group" },
                    ].map((s, i) => (
                        <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{s.val}</div>
                            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{s.lbl}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 22, overflowX: "auto", paddingBottom: 4 }}>
                    {itinerary.map((d) => (
                        <button key={d.day} className={`day-tab ${d.day === activeDay ? "active" : "inactive"}`} onClick={() => setActiveDay(d.day)}>Day {d.day}</button>
                    ))}
                </div>

                {dayData && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Day {activeDay}</h2>
                            <span style={{ background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#c084fc" }}>{dayData.places.length} stops</span>
                        </div>
                        {dayData.places.map((place, i) => {
                            const safety = sc(place.safety);
                            return (
                                <div key={i} className="place-card" style={{ animationDelay: `${i * 0.1}s` }} onClick={() => onPlace(place)}>
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                                    <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{place.emoji}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{place.name}</div>
                                            <div style={{ background: safety.bg, borderRadius: 8, padding: "3px 8px", fontSize: 11, color: safety.color, fontWeight: 600, flexShrink: 0 }}>{place.safety}</div>
                                        </div>
                                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 6 }}>{place.type}</div>
                                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>🕐 {place.time}</span>
                                            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>⏱ {place.duration}</span>
                                            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>📏 {place.distance}</span>
                                        </div>
                                    </div>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, alignSelf: "center" }}><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ marginTop: 24, padding: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, textAlign: "center" }}>
                    <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 12 }}>🛡️ Safety scores are ML-predicted · Prototype data</p>
                </div>
            </div>
        </Wrap>
    );
}
