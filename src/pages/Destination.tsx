import { useState, useEffect, useRef } from "react";
import { Wrap, Logo, BackBtn } from "../components/ui";
import { loadMapsApi, emojiForTypes } from "../utils/maps";

interface Suggestion {
    placeId: string;
    main: string;
    secondary: string;
    emoji: string;
}

interface Props {
    onNext: (dest: { placeId: string; main: string; secondary: string; emoji: string }) => void;
    onBack?: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

export default function Destination({ onNext, onBack }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Suggestion[]>([]);
    const [selected, setSelected] = useState<Suggestion | null>(null);
    const [focused, setFocused] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [animIn, setAnimIn] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const debouncedQuery = useDebounce(query, 150);

    useEffect(() => {
        loadMapsApi()
            .then(() => { tokenRef.current = new google.maps.places.AutocompleteSessionToken(); setApiReady(true); })
            .catch((err) => console.error("Maps API failed:", err));
        setTimeout(() => setAnimIn(true), 80);
    }, []);

    useEffect(() => {
        if (!apiReady) return;
        if (selected && debouncedQuery === selected.main) return;
        if (debouncedQuery.trim().length < 2) { setResults([]); return; }
        let cancelled = false;
        setLoading(true);
        google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: debouncedQuery, sessionToken: tokenRef.current ?? undefined })
            .then(({ suggestions }) => {
                if (cancelled) return;
                setLoading(false);
                setResults(suggestions.slice(0, 6).map((s) => ({ placeId: s.placePrediction.placeId, main: s.placePrediction.mainText.text, secondary: s.placePrediction.secondaryText.text, emoji: emojiForTypes(s.placePrediction.types) })));
                setActiveIdx(-1);
            })
            .catch(() => { if (!cancelled) { setLoading(false); setResults([]); } });
        return () => { cancelled = true; };
    }, [debouncedQuery, apiReady, selected]);

    const pick = (p: Suggestion) => { setSelected(p); setQuery(p.main); setResults([]); setFocused(false); if (apiReady) tokenRef.current = new google.maps.places.AutocompleteSessionToken(); };
    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!results.length) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && activeIdx >= 0) pick(results[activeIdx]);
        if (e.key === "Escape") { setResults([]); setFocused(false); }
    };
    const showDrop = focused && results.length > 0;

    return (
        <Wrap>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(22px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
                <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeUp 0.6s ease both" }}>
                    {onBack && <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}><BackBtn onClick={onBack} /></div>}
                    <Logo />
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, fontFamily: "'Playfair Display',serif", fontStyle: "italic", marginTop: 8 }}>Your safe journey begins here</p>
                </div>
                <div style={{ width: "100%", maxWidth: 520, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "28px", boxShadow: "0 32px 80px rgba(0,0,0,0.45)", animation: "fadeUp 0.7s ease 0.1s both" }}>
                    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 14 }}>Where do you want to explore?</p>
                    <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, background: focused ? "rgba(192,132,252,0.06)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${focused ? "rgba(192,132,252,0.55)" : "rgba(255,255,255,0.1)"}`, borderRadius: showDrop ? "15px 15px 0 0" : "15px", padding: "13px 16px", transition: "all 0.2s", boxShadow: focused ? "0 0 0 4px rgba(192,132,252,0.07)" : "none" }}>
                            {loading ? <div style={{ width: 17, height: 17, borderRadius: "50%", border: "2px solid rgba(192,132,252,0.25)", borderTopColor: "#c084fc", animation: "spin 0.8s linear infinite", flexShrink: 0 }} /> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={focused ? "#c084fc" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.2s" }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                            <input className="sy-input" value={query} onChange={(e) => { const v = e.target.value; setQuery(v); if (selected && v !== selected.main) setSelected(null); }} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 300)} onKeyDown={onKey} placeholder="Search city, country..." autoComplete="off" spellCheck={false} />
                            {query && <button onClick={() => { setQuery(""); setSelected(null); setResults([]); }} style={{ background: "rgba(255,255,255,0.09)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", flexShrink: 0, fontSize: 13 }}>×</button>}
                        </div>
                        {showDrop && (
                            <div style={{ position: "absolute", width: "100%", top: "100%", zIndex: 100, background: "rgba(10,10,18,0.97)", backdropFilter: "blur(20px)", border: "1.5px solid rgba(192,132,252,0.28)", borderTop: "1px solid rgba(255,255,255,0.05)", borderRadius: "0 0 15px 15px", overflow: "hidden", animation: "dropIn 0.18s ease forwards", boxShadow: "0 18px 55px rgba(0,0,0,0.55)" }}>
                                <div style={{ padding: "8px 20px 3px", fontSize: 10.5, color: "rgba(255,255,255,0.22)", fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase" }}>Suggestions</div>
                                {results.map((p, i) => (
                                    <div key={p.placeId} className={`result-row ${i === activeIdx ? "active" : ""}`} style={{ animationDelay: `${i * 0.035}s` }} onMouseDown={() => pick(p)} onMouseEnter={() => setActiveIdx(i)}>
                                        <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{p.emoji}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: "#fff", fontWeight: 500, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.main}</div>
                                            <div style={{ color: "rgba(255,255,255,0.32)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.secondary}</div>
                                        </div>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
                                    </div>
                                ))}
                                <div style={{ padding: "6px 14px 8px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "sans-serif" }}>Powered by Google</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {selected && (
                        <div style={{ marginTop: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 15, padding: "15px", animation: "fadeUp 0.35s ease both" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(124,58,237,0.32),rgba(192,132,252,0.1))", border: "1px solid rgba(192,132,252,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{selected.emoji}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{selected.main}</div>
                                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12 }}>{selected.secondary}</div>
                                </div>
                                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#10b981", fontWeight: 600 }}>✓</div>
                            </div>
                        </div>
                    )}
                    <div style={{ marginTop: 16 }}>
                        <button className="btn-primary" disabled={!selected} onClick={() => selected && onNext(selected)}>{selected ? `Continue with ${selected.main} →` : "Select a Destination"}</button>
                    </div>
                </div>
                <p style={{ marginTop: 20, color: "rgba(255,255,255,0.17)", fontSize: 12, animation: "fadeUp 0.7s ease 0.3s both" }}>🛡️ Safety scores powered by ML · Prototype mode</p>
            </div>
        </Wrap>
    );
}
