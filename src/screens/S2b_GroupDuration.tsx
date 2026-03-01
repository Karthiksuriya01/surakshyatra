import { useState } from "react";
import { Wrap, BackBtn } from "../components/ui";
import type { Destination } from "../constants/data";

export type GroupSize = "solo" | "couple" | "family" | "friends";

interface Props {
    dest: Destination;
    onNext: (groupSize: GroupSize, days: number) => void;
    onBack: () => void;
}

const GROUP_OPTIONS: { id: GroupSize; label: string; emoji: string; desc: string }[] = [
    { id: "solo", label: "Solo", emoji: "🧍", desc: "Just me, myself & I" },
    { id: "couple", label: "Couple", emoji: "👫", desc: "Romantic getaway" },
    { id: "family", label: "Family", emoji: "👨‍👩‍👧‍👦", desc: "With kids & loved ones" },
    { id: "friends", label: "Friends", emoji: "👯", desc: "Group adventure" },
];

const QUICK_DAYS = [1, 2, 3, 5, 7, 10];

export default function S2b_GroupDuration({ dest, onNext, onBack }: Props) {
    const [group, setGroup] = useState<GroupSize>("solo");
    const [days, setDays] = useState(3);

    return (
        <Wrap>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px", animation: "fadeUp 0.6s ease both" }}>
                <BackBtn onClick={onBack} />

                {/* Header */}
                <div style={{ marginTop: 28, marginBottom: 32 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 30, padding: "6px 14px", fontSize: 12, color: "#c084fc", fontWeight: 500, marginBottom: 16 }}>📍 {dest.main}</div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎒</div>
                    <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>Trip Details</h1>
                    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 15 }}>Who's going and for how long?</p>
                </div>

                {/* Group Size */}
                <div style={{ marginBottom: 32 }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14, fontWeight: 500 }}>Who's Travelling</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {GROUP_OPTIONS.map((g) => {
                            const selected = group === g.id;
                            return (
                                <button
                                    key={g.id}
                                    onClick={() => setGroup(g.id)}
                                    style={{
                                        background: selected ? "rgba(192,132,252,0.12)" : "rgba(255,255,255,0.03)",
                                        border: selected ? "1.5px solid rgba(192,132,252,0.5)" : "1.5px solid rgba(255,255,255,0.08)",
                                        borderRadius: 16,
                                        padding: "18px 14px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "all 0.2s ease",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    {selected && (
                                        <div style={{
                                            position: "absolute", top: 10, right: 10,
                                            width: 18, height: 18, borderRadius: "50%",
                                            background: "linear-gradient(135deg,#7c3aed,#c084fc)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, color: "#fff",
                                        }}>✓</div>
                                    )}
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>{g.emoji}</div>
                                    <div style={{ color: selected ? "#c084fc" : "#fff", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{g.label}</div>
                                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{g.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 28 }} />

                {/* Trip Duration */}
                <div style={{ marginBottom: 32 }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14, fontWeight: 500 }}>Trip Duration</p>
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginBottom: 22 }}>
                            <button
                                onClick={() => setDays((d) => Math.max(1, d - 1))}
                                style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}
                            >−</button>
                            <div>
                                <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, background: "linear-gradient(135deg,#c084fc,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{days}</div>
                                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>{days === 1 ? "day" : "days"}</div>
                            </div>
                            <button
                                onClick={() => setDays((d) => Math.min(14, d + 1))}
                                style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}
                            >+</button>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                            {QUICK_DAYS.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDays(d)}
                                    style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${days === d ? "#c084fc" : "rgba(255,255,255,0.1)"}`, background: days === d ? "rgba(192,132,252,0.15)" : "transparent", color: days === d ? "#c084fc" : "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s ease" }}
                                >{d}d</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary pill */}
                <div style={{ background: "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <div>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
                            {GROUP_OPTIONS.find((g) => g.id === group)!.emoji}&nbsp;
                            {GROUP_OPTIONS.find((g) => g.id === group)!.label} · {days} {days === 1 ? "day" : "days"} in {dest.main}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 2 }}>AI will personalise preferences for you next</div>
                    </div>
                </div>

                <button className="btn-primary" onClick={() => onNext(group, days)}>
                    Choose Preferences →
                </button>
            </div>
        </Wrap>
    );
}
