import { useState, useEffect, useRef, useCallback } from "react";
import { Wrap, Logo, BackBtn } from "../components/ui";
import {
    generateTripPlan,
    fetchPlaceDetails,
    getPlacePhotoUrl,
    generatePlaceInsights,
    generateChatResponse,
    resolveActivityCoords,
    generateSingleActivity,
    fetchSafetyScore,
    generateSafetyExplanation,
} from "../services/ai";
import type { TripPlan, ItineraryDay, Activity, PlaceDetails, ChatMessage, SafetyScore } from "../types/trip";
import type { Destination } from "../constants/data";
import type { SourcePlace, GroupSize } from "../types/trip";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

const GROUP_EMOJI: Record<string, string> = {
    solo: "🧍", couple: "👫", family: "👨‍👩‍👧‍👦", friends: "👯",
};

interface Props {
    dest: Destination;
    prefs: string[];
    days: number;
    groupSize?: GroupSize;
    source?: SourcePlace | null;
    onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating?: number }) {
    if (!rating) return null;
    return (
        <span className="stars">
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`star ${i <= Math.round(rating) ? "" : "empty"}`}>★</span>
            ))}
            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>{rating.toFixed(1)}</span>
        </span>
    );
}

function DirectionsButton({ placeName, address }: { placeName: string; address: string }) {
    const href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeName + " " + address)}`;
    return (
        <a className="dir-btn" href={href} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 19-9-9 19-2-8-8-2z" />
            </svg>
            Directions
        </a>
    );
}

// ── Place Detail Sheet ────────────────────────────────────────────────────────

// ── Safety badge helper ───────────────────────────────────────────────────────

const SAFETY_COLOR: Record<string, string> = {
    Safe: "#10b981",
    Moderate: "#f59e0b",
    Risky: "#ef4444",
};
const SAFETY_BG: Record<string, string> = {
    Safe: "rgba(16,185,129,0.12)",
    Moderate: "rgba(245,158,11,0.12)",
    Risky: "rgba(239,68,68,0.12)",
};

// Injected once — CSS keyframe for the blinking dot
if (typeof document !== "undefined" && !document.getElementById("safety-blink-style")) {
    const s = document.createElement("style");
    s.id = "safety-blink-style";
    s.textContent = `
        @keyframes safePulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
            50% { opacity: 0.55; box-shadow: 0 0 6px 2px currentColor; }
        }
        .safety-dot {
            display: inline-block;
            width: 7px; height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
            animation: safePulse 1.6s ease-in-out infinite;
        }
    `;
    document.head.appendChild(s);
}

interface PlaceSheetProps {
    activity: Activity;
    destination: string;
    groupSize: string;
    onClose: () => void;
}

function PlaceSheet({ activity, destination, groupSize, onClose }: PlaceSheetProps) {
    const [details, setDetails] = useState<PlaceDetails | null>(null);
    const [insights, setInsights] = useState<string>("");
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [safetyScore, setSafetyScore] = useState<SafetyScore | null>(null);
    const [safetyLoading, setSafetyLoading] = useState(true);
    const [safetyExplain, setSafetyExplain] = useState<string>("");
    const [explainLoading, setExplainLoading] = useState(false);

    useEffect(() => {
        // Prevent body scroll
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    useEffect(() => {
        let cancelled = false;

        fetchPlaceDetails(activity.place_name, activity.place_address, destination)
            .then((d) => {
                if (cancelled) return;
                setDetails(d);
                if (d?.photos?.[0]) {
                    setPhotoUrl(getPlacePhotoUrl(d.photos[0].name, 700));
                } else if (activity.place_image_url) {
                    setPhotoUrl(activity.place_image_url);
                }
                setLoadingDetails(false);
            });

        generatePlaceInsights(activity.place_name, activity.place_details, destination)
            .then((text) => { if (!cancelled) { setInsights(text); setLoadingInsights(false); } });

        // ── Safety score ──
        const placeCategory = "tourist_spot";
        const locationType = "urban";
        const preferredTime = "morning";
        fetchSafetyScore(activity.place_name, placeCategory, locationType, groupSize, preferredTime)
            .then((score) => {
                if (cancelled) return;
                setSafetyScore(score);
                setSafetyLoading(false);
                if (score && score.safety_level !== "Safe" && score.gemini_params) {
                    setExplainLoading(true);
                    generateSafetyExplanation(activity.place_name, score.safety_level, score.gemini_params)
                        .then((text) => { if (!cancelled) { setSafetyExplain(text); setExplainLoading(false); } });
                }
            });

        return () => { cancelled = true; };
    }, [activity.place_name]);

    const mapsLink = details?.googleMapsUri
        ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place_name + " " + destination)}`;

    return (
        <div className="place-sheet-overlay" onClick={onClose}>
            <div className="place-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-drag-handle" />

                {/* ── Hero image ── */}
                <div style={{ position: "relative", height: 200, background: "linear-gradient(135deg,rgba(124,58,237,0.4),rgba(14,165,233,0.25))", overflow: "hidden" }}>
                    {photoUrl ? (
                        <img src={photoUrl} alt={activity.place_name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={() => setPhotoUrl("")} />
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 72, filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.4))" }}>
                            📍
                        </div>
                    )}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, #12121a)" }} />
                    <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>

                <div style={{ padding: "16px 20px 32px" }}>
                    {/* ── Name + type ── */}
                    <div style={{ marginBottom: 12 }}>
                        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 8 }}>
                            {activity.place_name}
                        </h2>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {!loadingDetails && details?.rating && <Stars rating={details.rating} />}
                            {!loadingDetails && details?.userRatingCount && (
                                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>({details.userRatingCount.toLocaleString()} reviews)</span>
                            )}
                        </div>
                        {loadingDetails && (
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <div className="skeleton" style={{ height: 16, width: 90 }} />
                                <div className="skeleton" style={{ height: 16, width: 60 }} />
                            </div>
                        )}
                    </div>

                    {/* ── Quick info chips ── */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                        <span className="tag-pill">🕐 {activity.best_time_to_visit}</span>
                        <span className="tag-pill">⏱ {activity.time_travel_each_location}</span>
                        {activity.ticket_pricing && <span className="tag-pill">🎟 {activity.ticket_pricing}</span>}
                    </div>

                    {/* ── Address ── */}
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 14px" }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
                        <div>
                            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Address</div>
                            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{details?.formattedAddress ?? activity.place_address}</div>
                        </div>
                    </div>

                    {/* ── Opening hours ── */}
                    {!loadingDetails && details?.regularOpeningHours && (
                        <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Opening Hours</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                <span style={{ fontSize: 8, width: 8, height: 8, borderRadius: "50%", background: details.regularOpeningHours.openNow ? "#10b981" : "#ef4444", display: "inline-block" }} />
                                <span style={{ color: details.regularOpeningHours.openNow ? "#10b981" : "#ef4444", fontSize: 12, fontWeight: 600 }}>
                                    {details.regularOpeningHours.openNow ? "Open Now" : "Closed Now"}
                                </span>
                            </div>
                            {details.regularOpeningHours.weekdayDescriptions?.map((d, i) => (
                                <div key={i} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.8 }}>{d}</div>
                            ))}
                        </div>
                    )}

                    {/* ── Safety Score Section ── */}
                    <div style={{ marginBottom: 16, background: safetyScore ? SAFETY_BG[safetyScore.safety_level] : "rgba(255,255,255,0.03)", border: `1px solid ${safetyScore ? SAFETY_COLOR[safetyScore.safety_level] + "44" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16 }}>🛡️</span>
                                <span style={{ color: safetyScore ? SAFETY_COLOR[safetyScore.safety_level] : "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 15 }}>Safety Analysis</span>
                                <span className="ai-badge">ML + Gemini</span>
                            </div>
                        </div>

                        {safetyLoading ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div className="skeleton" style={{ height: 14, width: 100 }} />
                                <div className="skeleton" style={{ height: 8, width: "100%", borderRadius: 4, marginTop: 4 }} />
                                <div className="skeleton" style={{ height: 8, width: "100%", borderRadius: 4 }} />
                                <div className="skeleton" style={{ height: 8, width: "100%", borderRadius: 4 }} />
                            </div>
                        ) : safetyScore ? (
                            <>
                                {/* Blinking level badge */}
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: SAFETY_BG[safetyScore.safety_level], border: `1px solid ${SAFETY_COLOR[safetyScore.safety_level]}55`, borderRadius: 20, padding: "6px 14px", marginBottom: 12 }}>
                                    <span className="safety-dot" style={{ background: SAFETY_COLOR[safetyScore.safety_level], color: SAFETY_COLOR[safetyScore.safety_level], width: 9, height: 9 }} />
                                    <span style={{ color: SAFETY_COLOR[safetyScore.safety_level], fontWeight: 700, fontSize: 14, letterSpacing: "0.03em" }}>{safetyScore.safety_level}</span>
                                </div>

                                {/* Confidence bars */}
                                {([
                                    { label: "Safe", val: safetyScore.confidence.safe, color: SAFETY_COLOR.Safe },
                                    { label: "Moderate", val: safetyScore.confidence.moderate, color: SAFETY_COLOR.Moderate },
                                    { label: "Risky", val: safetyScore.confidence.risky, color: SAFETY_COLOR.Risky },
                                ] as const).map(({ label, val, color }) => (
                                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, width: 56, flexShrink: 0 }}>{label}</div>
                                        <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${val * 100}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
                                        </div>
                                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, width: 32, textAlign: "right" }}>{Math.round(val * 100)}%</div>
                                    </div>
                                ))}

                                {/* Safety explanation for Risky/Moderate */}
                                {safetyScore.safety_level !== "Safe" && (
                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${SAFETY_COLOR[safetyScore.safety_level]}22` }}>
                                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Why this matters</div>
                                        {explainLoading ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                                <div className="skeleton" style={{ height: 12, width: "100%" }} />
                                                <div className="skeleton" style={{ height: 12, width: "90%" }} />
                                                <div className="skeleton" style={{ height: 12, width: "80%" }} />
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                {safetyExplain.split("\n").filter(l => l.trim()).map((line, i) => (
                                                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                                        <span style={{ color: SAFETY_COLOR[safetyScore.safety_level], fontSize: 13, flexShrink: 0, lineHeight: 1.6 }}>•</span>
                                                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.6 }}>{line.replace(/^[•\-*]\s*/, "")}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontStyle: "italic" }}>Safety score unavailable — ensure the ML server is running.</p>
                        )}
                    </div>

                    {/* ── AI Review Summary (Places API powered) ── */}
                    <div className="review-summary" style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 16 }}>⭐</span>
                            <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 14 }}>Review Summary</span>
                            <span className="ai-badge">✨ Summarized with Gemini</span>
                        </div>
                        {loadingDetails ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div className="skeleton" style={{ height: 13, width: "100%" }} />
                                <div className="skeleton" style={{ height: 13, width: "85%" }} />
                                <div className="skeleton" style={{ height: 13, width: "70%" }} />
                            </div>
                        ) : details?.reviewSummary ? (
                            <>
                                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.7 }}>
                                    {details.reviewSummary.text.text}
                                </p>
                                {details.reviewSummary.reviewsUri && (
                                    <a href={details.reviewSummary.reviewsUri} target="_blank" rel="noopener noreferrer"
                                        style={{ color: "#c084fc", fontSize: 11, marginTop: 8, display: "inline-block", textDecoration: "none" }}>
                                        Read all reviews →
                                    </a>
                                )}
                            </>
                        ) : (
                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>
                                Review summary not available for this place.
                            </p>
                        )}
                    </div>

                    {/* ── Place description ── */}
                    <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>About</div>
                        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.7 }}>{activity.place_details}</p>
                    </div>

                    {/* ── AI Traveller Insights ── */}
                    <div style={{ marginBottom: 20, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 16 }}>🛡️</span>
                            <span style={{ color: "#c084fc", fontWeight: 600, fontSize: 14 }}>AI Traveller Insights</span>
                            <span className="ai-badge">Gemini</span>
                        </div>
                        {loadingInsights ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div className="skeleton" style={{ height: 13, width: "100%" }} />
                                <div className="skeleton" style={{ height: 13, width: "88%" }} />
                                <div className="skeleton" style={{ height: 13, width: "75%" }} />
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                {insights.split("\n").filter(l => l.trim()).map((line, i) => (
                                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                        <span style={{ color: "#c084fc", fontSize: 14, flexShrink: 0, lineHeight: 1.6 }}>•</span>
                                        <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.7 }}>
                                            {line.replace(/^[•\-*]\s*/, "")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Actions ── */}
                    <div style={{ display: "flex", gap: 10 }}>
                        {details?.websiteUri && (
                            <a href={details.websiteUri} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "13px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                🌐 Website
                            </a>
                        )}
                        <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 2, padding: "13px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
                            🗺️ Get Directions
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
    tripContext: string;
    onClose: () => void;
}

function ChatPanel({ tripContext, onClose }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: "assistant", text: "Hi! I'm your SurakshYatra AI guide 🛡️. Ask me anything about your trip — safety, food, transport, local tips, or anything else!" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");
        const newMessages: ChatMessage[] = [...messages, { role: "user", text }];
        setMessages(newMessages);
        setLoading(true);
        try {
            const reply = await generateChatResponse(newMessages, tripContext);
            setMessages([...newMessages, { role: "assistant", text: reply }]);
        } catch {
            setMessages([...newMessages, { role: "assistant", text: "Sorry, I couldn't connect right now. Please try again." }]);
        }
        setLoading(false);
    }, [input, messages, loading, tripContext]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    return (
        <div className="chat-panel">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🛡️</div>
                    <div>
                        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Trip Assistant</div>
                        <div className="ai-badge" style={{ marginTop: 2 }}>✨ Powered by Gemini</div>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 30, height: 30, color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✕</button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                        {m.text}
                    </div>
                ))}
                {loading && (
                    <div className="chat-bubble-ai" style={{ display: "flex", gap: 4, alignItems: "center", padding: "10px 16px" }}>
                        {[0, 1, 2].map((i) => (
                            <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#c084fc", animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
                        ))}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8 }}>
                <input
                    className="sy-input"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "10px 16px", fontSize: 13 }}
                    placeholder="Ask about safety, food, tips…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button onClick={send} disabled={loading || !input.trim()}
                    style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084fc)", border: "none", color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    ➤
                </button>
            </div>
        </div>
    );
}

// ── Map Component ─────────────────────────────────────────────────────────────

interface MapViewProps {
    activities: Activity[];
    onMarkerClick: (activity: Activity) => void;
}

function MapView({ activities, onMarkerClick }: MapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (!mapRef.current) return;

        const validActivities = activities.filter(
            (a) => a.geo_coordinates.latitude !== 0 && a.geo_coordinates.longitude !== 0
        );
        if (validActivities.length === 0) return;

        const center = { lat: validActivities[0].geo_coordinates.latitude, lng: validActivities[0].geo_coordinates.longitude };

        async function initMap() {
            const { Map } = await (window as any).google.maps.importLibrary("maps");
            const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary("marker");

            if (!mapRef.current) return;

            const map = new Map(mapRef.current, {
                center,
                zoom: 13,
                mapId: "SURAKSH_YATRA_MAP",
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: "cooperative",
                colorScheme: "DARK" as any,
            });
            googleMapRef.current = map;

            // Clear old markers
            markersRef.current.forEach((m) => m.map = null);
            markersRef.current = [];

            // Fit bounds
            const bounds = new (window as any).google.maps.LatLngBounds();

            validActivities.forEach((activity, i) => {
                const pos = { lat: activity.geo_coordinates.latitude, lng: activity.geo_coordinates.longitude };
                bounds.extend(pos);

                // Create numbered pin
                const pin = new PinElement({
                    glyph: `${i + 1}`,
                    glyphColor: "#fff",
                    background: "#7c3aed",
                    borderColor: "#c084fc",
                    scale: 1.0,
                });

                const marker = new AdvancedMarkerElement({
                    map,
                    position: pos,
                    title: activity.place_name,
                    content: pin.element,
                });

                marker.addListener("click", () => onMarkerClick(activity));
                markersRef.current.push(marker);
            });

            if (validActivities.length > 1) {
                map.fitBounds(bounds, 60);
            }
        }

        if ((window as any).google?.maps) {
            initMap();
        }
    }, [activities]);

    return (
        <div className="map-container" style={{ height: 220 }}>
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingItinerary({ dest }: { dest: string }) {
    return (
        <Wrap>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20, padding: "24px", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid rgba(192,132,252,0.2)", borderTopColor: "#c084fc", animation: "spin 0.9s linear infinite" }} />
                <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>Generating your itinerary</h2>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, maxWidth: 280 }}>
                    Personalising a trip to <strong style={{ color: "#c084fc" }}>{dest}</strong> with AI-curated activities…
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {["Analysing places", "Checking routes", "Curating activities", "Building schedule"].map((label, i) => (
                        <span key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.4)", animation: `pulse 1.5s ease ${i * 0.4}s infinite` }}>{label}</span>
                    ))}
                </div>
            </div>
        </Wrap>
    );
}

// ── Main Itinerary Page ───────────────────────────────────────────────────────

export default function Itinerary({ dest, prefs, days, groupSize, source, onBack }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
    const [activeDay, setActiveDay] = useState(1);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [mapsLoaded, setMapsLoaded] = useState(false);

    // Load Google Maps JS API
    useEffect(() => {
        if ((window as any).google?.maps) { setMapsLoaded(true); return; }

        const existing = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existing) {
            existing.addEventListener("load", () => setMapsLoaded(true));
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=maps,marker,places&v=beta&loading=async`;
        script.async = true;
        script.onload = () => setMapsLoaded(true);
        document.head.appendChild(script);
    }, []);

    // Generate trip plan
    useEffect(() => {
        const origin = source?.main ?? "India";
        const budget = "mid-range";

        generateTripPlan(dest.main, origin, days, groupSize ?? "solo", budget, prefs)
            .then(async (plan) => {
                // Resolve any activities with 0,0 coordinates
                const resolvedDays = await Promise.all(
                    plan.itinerary.map(async (day) => ({
                        ...day,
                        activities: await Promise.all(
                            day.activities.map((a) => resolveActivityCoords(a, dest.main))
                        ),
                    }))
                );
                setTripPlan({ ...plan, itinerary: resolvedDays });
                setLoading(false);
            })
            .catch((err) => {
                console.error("Trip plan generation failed:", err);
                setError("Failed to generate itinerary. Please check your API key and try again.");
                setLoading(false);
            });
    }, []);

    if (loading) return <LoadingItinerary dest={dest.main} />;

    if (error) {
        return (
            <Wrap>
                <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 12 }}>Generation Failed</h2>
                    <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>{error}</p>
                    <button className="back-btn" onClick={onBack}>← Go Back</button>
                </div>
            </Wrap>
        );
    }

    if (!tripPlan) return null;

    const activeDayData: ItineraryDay | undefined = tripPlan.itinerary.find((d) => d.day === activeDay);
    const totalPlaces = tripPlan.itinerary.reduce((acc, d) => acc + d.activities.length, 0);

    // Trip context string for chat
    const tripContext = `Destination: ${tripPlan.destination}
Origin: ${tripPlan.origin}
Duration: ${tripPlan.duration}
Group: ${tripPlan.group_size}
Budget: ${tripPlan.budget}
Itinerary: ${tripPlan.itinerary.map((d) =>
        `Day ${d.day} (${d.day_plan}): ${d.activities.map((a) => a.place_name).join(", ")}`
    ).join(" | ")}`;

    return (
        <Wrap>
            <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 18px 100px", animation: "fadeIn 0.5s ease both" }}>

                {/* ── Header ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <BackBtn onClick={onBack} />
                    <Logo small />
                </div>

                {/* ── Destination title ── */}
                <div style={{ marginBottom: 18 }}>
                    <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
                        {dest.emoji ?? "📍"} {tripPlan.destination}
                    </h1>
                    {source && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "4px 12px" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{source.emoji} {source.main}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{dest.emoji ?? "📍"} {dest.main}</span>
                        </div>
                    )}
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4 }}>
                        {tripPlan.duration} · AI-curated · {tripPlan.budget}
                    </p>
                </div>

                {/* ── Stats strip ── */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {[
                        { icon: "📍", val: `${totalPlaces}`, lbl: "Places" },
                        { icon: "📅", val: `${days}`, lbl: "Days" },
                        { icon: GROUP_EMOJI[groupSize ?? "solo"] ?? "🧍", val: groupSize ? groupSize.charAt(0).toUpperCase() + groupSize.slice(1) : "Solo", lbl: "Group" },
                        { icon: "🛡️", val: "AI", lbl: "Curated" },
                    ].map((s, i) => (
                        <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
                            <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{s.val}</div>
                            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{s.lbl}</div>
                        </div>
                    ))}
                </div>

                {/* ── Map ── */}
                {mapsLoaded && activeDayData && (
                    <div style={{ marginBottom: 18 }}>
                        <MapView
                            activities={activeDayData.activities}
                            onMarkerClick={setSelectedActivity}
                        />
                    </div>
                )}

                {/* ── Day tabs ── */}
                <div style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                    {tripPlan.itinerary.map((d) => (
                        <button key={d.day} className={`day-tab ${d.day === activeDay ? "active" : "inactive"}`}
                            onClick={() => setActiveDay(d.day)}>
                            Day {d.day}
                        </button>
                    ))}
                </div>

                {/* ── Day summary ── */}
                {activeDayData && (
                    <>
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Day {activeDay}</h2>
                                <span style={{ background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#c084fc" }}>
                                    {activeDayData.activities.length} stops
                                </span>
                            </div>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{activeDayData.day_plan}</p>
                            <div style={{ marginTop: 6 }}>
                                <span className="tag-pill">🕐 Best time: {activeDayData.best_time_to_visit_day}</span>
                            </div>
                        </div>

                        {/* ── Activity cards ── */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {activeDayData.activities.map((activity, i) => (
                                <ActivityCard
                                    key={`${activeDay}-${i}`}
                                    index={i}
                                    activity={activity}
                                    destination={dest.main}
                                    groupSize={groupSize ?? "solo"}
                                    onClick={() => setSelectedActivity(activity)}
                                />
                            ))}
                        </div>

                        {/* ── Add a place ── */}
                        <AddPlaceButton
                            destination={dest.main}
                            onAdd={(newActivity) => {
                                setTripPlan((prev) => {
                                    if (!prev) return prev;
                                    return {
                                        ...prev,
                                        itinerary: prev.itinerary.map((d) =>
                                            d.day === activeDay
                                                ? { ...d, activities: [...d.activities, newActivity] }
                                                : d
                                        ),
                                    };
                                });
                            }}
                        />
                    </>
                )}

                {/* ── Footer note ── */}
                <div style={{ marginTop: 28, padding: "13px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, textAlign: "center" }}>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>🛡️ AI-generated itinerary · Tap any place for safety scores & details</p>
                </div>
            </div>

            {/* ── Place Detail Sheet ── */}
            {selectedActivity && (
                <PlaceSheet
                    activity={selectedActivity}
                    destination={dest.main}
                    groupSize={groupSize ?? "solo"}
                    onClose={() => setSelectedActivity(null)}
                />
            )}

            {/* ── Chat Panel ── */}
            {chatOpen && (
                <ChatPanel tripContext={tripContext} onClose={() => setChatOpen(false)} />
            )}

            {/* ── Chat FAB ── */}
            {!chatOpen && (
                <button className="chat-fab" onClick={() => setChatOpen(true)} title="Ask AI about your trip">
                    💬
                </button>
            )}
        </Wrap>
    );
}

// ── Activity Card ─────────────────────────────────────────────────────────────

function ActivityCard({
    activity, index, destination = "", groupSize = "solo", onClick
}: {
    activity: Activity;
    index: number;
    destination?: string;
    groupSize?: string;
    onClick: () => void;
}) {
    const [cardPhoto, setCardPhoto] = useState<string>("");
    const [photoLoaded, setPhotoLoaded] = useState(false);
    const [cardSafety, setCardSafety] = useState<SafetyScore | null>(null);
    const [cardSafetyLoading, setCardSafetyLoading] = useState(true);

    // Eagerly fetch a small thumbnail from Places API (or fall back to AI url)
    useEffect(() => {
        let cancelled = false;
        if (activity.place_image_url) {
            setCardPhoto(activity.place_image_url);
            return;
        }
        const dest = destination || activity.place_address;
        fetchPlaceDetails(activity.place_name, activity.place_address, dest)
            .then((d) => {
                if (cancelled) return;
                if (d?.photos?.[0]) {
                    setCardPhoto(getPlacePhotoUrl(d.photos[0].name, 200));
                }
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [activity.place_name]);

    // Fetch safety score for each card
    useEffect(() => {
        let cancelled = false;
        fetchSafetyScore(activity.place_name, "tourist_spot", "urban", groupSize, "morning")
            .then((score) => { if (!cancelled) { setCardSafety(score); setCardSafetyLoading(false); } });
        return () => { cancelled = true; };
    }, [activity.place_name, groupSize]);

    return (
        <div className="activity-card" style={{ animationDelay: `${index * 0.08}s` }} onClick={onClick}>
            {/* Stop number */}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 8px rgba(124,58,237,0.4)" }}>
                {index + 1}
            </div>

            {/* Thumbnail — real photo or placeholder */}
            <div className="activity-img-placeholder" style={{ position: "relative", overflow: "hidden", background: cardPhoto ? "transparent" : undefined }}>
                {cardPhoto ? (
                    <img
                        src={cardPhoto}
                        alt={activity.place_name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 14, opacity: photoLoaded ? 1 : 0, transition: "opacity 0.3s" }}
                        onLoad={() => setPhotoLoaded(true)}
                        onError={() => { setCardPhoto(""); }}
                    />
                ) : null}
                {/* Show placeholder emoji until photo loads */}
                {(!cardPhoto || !photoLoaded) && (
                    <span style={{ fontSize: 26 }}>📍</span>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, lineHeight: 1.3, marginBottom: 4 }}>{activity.place_name}</div>
                        {cardSafetyLoading ? (
                            <div className="skeleton" style={{ height: 16, width: 66, borderRadius: 10 }} />
                        ) : cardSafety ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: SAFETY_BG[cardSafety.safety_level], border: `1px solid ${SAFETY_COLOR[cardSafety.safety_level]}44`, borderRadius: 10, padding: "3px 8px" }}>
                                <span className="safety-dot" style={{ background: SAFETY_COLOR[cardSafety.safety_level], color: SAFETY_COLOR[cardSafety.safety_level] }} />
                                <span style={{ color: SAFETY_COLOR[cardSafety.safety_level], fontSize: 11, fontWeight: 700 }}>{cardSafety.safety_level}</span>
                            </div>
                        ) : null}
                    </div>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </div>
                <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginBottom: 8, lineHeight: 1.4 }}>
                    {activity.place_details.slice(0, 80)}{activity.place_details.length > 80 ? "…" : ""}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>⏱ {activity.time_travel_each_location}</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>🕐 {activity.best_time_to_visit}</span>
                    {activity.ticket_pricing && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>🎟 {activity.ticket_pricing}</span>}
                    <DirectionsButton placeName={activity.place_name} address={activity.place_address} />
                </div>
            </div>
        </div>
    );
}

// ── Add a Place Button + Modal ────────────────────────────────────────────────

function AddPlaceButton({
    destination,
    onAdd,
}: {
    destination: string;
    onAdd: (a: Activity) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [generating, setGenerating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAdd = async () => {
        const q = query.trim();
        if (!q || generating) return;
        setGenerating(true);
        try {
            const activity = await generateSingleActivity(q, destination);
            onAdd(activity);
            setQuery("");
            setOpen(false);
        } catch {
            // fallback handled inside generateSingleActivity
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 80);
    }, [open]);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 8, padding: "13px", background: "rgba(124,58,237,0.07)", border: "1.5px dashed rgba(124,58,237,0.35)", borderRadius: 16, color: "rgba(192,132,252,0.8)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.18s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.14)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,58,237,0.07)")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Add a place to this day
            </button>

            {open && (
                <div className="place-sheet-overlay" onClick={() => setOpen(false)}>
                    <div style={{ width: "100%", maxWidth: 500, background: "#16161e", borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", border: "1px solid rgba(255,255,255,0.08)", animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
                        onClick={(e) => e.stopPropagation()}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
                        <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Add a Place</h3>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 18 }}>Type any place name in {destination} — AI will fill in the details.</p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "0 14px" }}>
                                <span style={{ fontSize: 16 }}>🔍</span>
                                <input
                                    ref={inputRef}
                                    className="sy-input"
                                    style={{ fontSize: 14, padding: "12px 0" }}
                                    placeholder={`e.g. Charminar, ${destination}`}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={generating || !query.trim()}
                                style={{ padding: "12px 18px", background: generating ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 14, color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: generating || !query.trim() ? "not-allowed" : "pointer", opacity: !query.trim() ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.18s" }}>
                                {generating ? (
                                    <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />Adding…</>
                                ) : "✚ Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
