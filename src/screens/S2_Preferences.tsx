import { useState } from "react";
import { Wrap, BackBtn } from "../components/ui";
import { PREFS } from "../constants/data";
import type { Destination } from "../constants/data";

interface Props {
    dest: Destination;
    onNext: (prefs: string[]) => void;
    onBack: () => void;
}

export default function S2_Preferences({ dest, onNext, onBack }: Props) {
    const [sel, setSel] = useState<string[]>(["popular"]);
    const toggle = (id: string) =>
        setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    return (
        <Wrap>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px", animation: "fadeUp 0.6s ease both" }}>
                <BackBtn onClick={onBack} />
                <div style={{ marginTop: 28, marginBottom: 32 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 30, padding: "6px 14px", fontSize: 12, color: "#c084fc", fontWeight: 500, marginBottom: 16 }}>📍 {dest.main}</div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👍</div>
                    <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>Trip Preferences</h1>
                    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 15 }}>What should your trip be about?</p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
                    {PREFS.map((p) => (
                        <button key={p.id} className={`pref-chip ${sel.includes(p.id) ? "selected" : ""}`} onClick={() => toggle(p.id)}>
                            {p.emoji} {p.label} {sel.includes(p.id) && <span style={{ color: "#c084fc", fontSize: 12 }}>✓</span>}
                        </button>
                    ))}
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px", marginBottom: 28 }}>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>Selected</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {sel.length === 0
                            ? <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 13 }}>None selected</span>
                            : sel.map((id) => {
                                const p = PREFS.find((x) => x.id === id)!;
                                return (
                                    <span key={id} style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#c084fc" }}>
                                        {p.emoji} {p.label}
                                    </span>
                                );
                            })}
                    </div>
                </div>

                <button className="btn-primary" disabled={sel.length === 0} onClick={() => onNext(sel)}>
                    Continue →
                </button>
            </div>
        </Wrap>
    );
}
