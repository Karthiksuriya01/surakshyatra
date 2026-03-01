import { useState } from "react";
import { Wrap, BackBtn } from "../components/ui";
import type { Destination } from "../constants/data";

interface Props {
    dest: Destination;
    prefs: string[];
    onNext: (days: number) => void;
    onBack: () => void;
}

export default function S3_Days({ dest, prefs, onNext, onBack }: Props) {
    const [days, setDays] = useState(3);

    return (
        <Wrap>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px", animation: "fadeUp 0.6s ease both" }}>
                <BackBtn onClick={onBack} />
                <div style={{ marginTop: 28, marginBottom: 32 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 30, padding: "6px 14px", fontSize: 12, color: "#c084fc", fontWeight: 500, marginBottom: 16 }}>📍 {dest.main}</div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                    <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>Trip Duration</h1>
                    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 15 }}>How many days are you planning?</p>
                </div>

                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px", marginBottom: 24, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginBottom: 24 }}>
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
                        {[1, 2, 3, 5, 7, 10].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${days === d ? "#c084fc" : "rgba(255,255,255,0.1)"}`, background: days === d ? "rgba(192,132,252,0.15)" : "transparent", color: days === d ? "#c084fc" : "rgba(255,255,255,0.45)", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                            >{d}d</button>
                        ))}
                    </div>
                </div>

                <div style={{ background: "rgba(192,132,252,0.05)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <div>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>AI will generate {days * 3}+ places for you</div>
                        <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 2 }}>Personalized for {prefs.join(", ")} in {dest.main}</div>
                    </div>
                </div>

                <button className="btn-primary" onClick={() => onNext(days)}>Generate My Itinerary ✨</button>
            </div>
        </Wrap>
    );
}
