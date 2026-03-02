import { useState, useEffect } from "react";
import { Wrap, BackBtn } from "../components/ui";
import { sc } from "../utils/helpers";
import type { Place } from "../constants/data";

interface Props {
    place: Place;
    onBack: () => void;
}

export default function PlaceDetail({ place, onBack }: Props) {
    const safety = sc(place.safety);
    const [barW, setBarW] = useState(0);
    useEffect(() => { setTimeout(() => setBarW(place.safety), 300); }, []);

    return (
        <Wrap>
            <div style={{ maxWidth: 560, margin: "0 auto", animation: "scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
                <div style={{ position: "relative", height: 220, background: "linear-gradient(135deg,rgba(124,58,237,0.4),rgba(14,165,233,0.3))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <div style={{ fontSize: 80, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))" }}>{place.emoji}</div>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,#0a0a0f)" }} />
                    <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}><BackBtn onClick={onBack} /></div>
                </div>
                <div style={{ padding: "0 24px 40px" }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{place.name}</h1>
                            <div style={{ background: safety.bg, border: `1px solid ${safety.color}44`, borderRadius: 10, padding: "6px 12px", flexShrink: 0, textAlign: "center" }}>
                                <div style={{ color: safety.color, fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{place.safety}</div>
                                <div style={{ color: safety.color, fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", marginTop: 1 }}>SAFETY</div>
                            </div>
                        </div>
                        <span style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{place.type}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        {[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ fontSize: 16, color: i <= Math.round(place.rating) ? "#f59e0b" : "rgba(255,255,255,0.15)" }}>★</span>)}
                        <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 14 }}>{place.rating}</span>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>/ 5.0</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 500 }}>Safety Score</span>
                            <span style={{ color: safety.color, fontSize: 13, fontWeight: 600 }}>{safety.label}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div className="bar-fill" style={{ width: `${barW}%`, background: `linear-gradient(90deg,${safety.color}66,${safety.color})` }} />
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        {[{ icon: "🕐", label: "Best Time", val: place.time }, { icon: "⏱️", label: "Duration", val: place.duration }, { icon: "📏", label: "Distance", val: place.distance }, { icon: "🟢", label: "Status", val: place.open }].map((info, i) => (
                            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px" }}>
                                <div style={{ fontSize: 18, marginBottom: 6 }}>{info.icon}</div>
                                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 3 }}>{info.label}</div>
                                <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{info.val}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7 }}>{place.desc}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 24 }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                        <div>
                            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>Address</div>
                            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{place.address}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>🔖 Save</button>
                        <button className="btn-primary" style={{ flex: 2, padding: "14px", fontSize: 14 }}>🗺️ Get Directions</button>
                    </div>
                </div>
            </div>
        </Wrap>
    );
}
