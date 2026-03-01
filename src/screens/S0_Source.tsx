import { useState, useEffect, useRef } from "react";
import { Wrap, Logo } from "../components/ui";
import { loadMapsApi, emojiForTypes } from "../utils/maps";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SourcePlace {
    placeId: string;
    main: string;
    secondary: string;
    emoji: string;
}

interface Suggestion {
    placeId: string;
    main: string;
    secondary: string;
    emoji: string;
}

interface Props {
    onNext: (source: SourcePlace) => void;
}

type DetectState = "detecting" | "detected" | "denied" | "manual";

// ── Debounce ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pull the best human-readable city + country from geocoder address components */
function extractPlace(result: google.maps.GeocoderResult): { main: string; secondary: string } {
    const get = (type: string) =>
        result.address_components.find((c) => c.types.includes(type))?.long_name ?? "";

    const city =
        get("locality") ||
        get("sublocality") ||
        get("administrative_area_level_2") ||
        get("administrative_area_level_1");
    const state = get("administrative_area_level_1");
    const country = get("country");

    const secondary = city === state ? country : [state, country].filter(Boolean).join(", ");
    return { main: city || result.formatted_address.split(",")[0], secondary };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function S0_Source({ onNext }: Props) {
    const [detectState, setDetectState] = useState<DetectState>("detecting");
    const [detected, setDetected] = useState<SourcePlace | null>(null);
    const [animIn, setAnimIn] = useState(false);
    const [apiReady, setApiReady] = useState(false);

    // Manual search state
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Suggestion[]>([]);
    const [selected, setSelected] = useState<Suggestion | null>(null);
    const [focused, setFocused] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [searchLoading, setSearchLoading] = useState(false);

    const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const debouncedQuery = useDebounce(query, 150);

    // ── Boot ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        setTimeout(() => setAnimIn(true), 80);

        loadMapsApi()
            .then(() => {
                tokenRef.current = new google.maps.places.AutocompleteSessionToken();
                setApiReady(true);
                requestLocation();
            })
            .catch(() => setDetectState("manual"));
    }, []);

    // ── Geolocation request ───────────────────────────────────────────────────
    const requestLocation = () => {
        setDetectState("detecting");
        if (!navigator.geolocation) { setDetectState("manual"); return; }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => reverseGeocode(coords.latitude, coords.longitude),
            () => setDetectState("denied"),
            { timeout: 8000, maximumAge: 60_000 }
        );
    };

    const reverseGeocode = (lat: number, lng: number) => {
        const gc = new google.maps.Geocoder();
        gc.geocode({ location: { lat, lng } }, (results, status) => {
            if (status !== google.maps.GeocoderStatus.OK || !results?.length) {
                setDetectState("denied");
                return;
            }
            // Prefer a locality-level result
            const best =
                results.find((r) => r.types.some((t) => ["locality", "sublocality"].includes(t))) ??
                results[0];
            const { main, secondary } = extractPlace(best);
            setDetected({
                placeId: best.place_id,
                main,
                secondary,
                emoji: "📍",
            });
            setDetectState("detected");
        });
    };

    // ── Autocomplete fetch ────────────────────────────────────────────────────
    useEffect(() => {
        if (!apiReady || detectState !== "manual") return;
        if (selected && debouncedQuery === selected.main) return;
        if (debouncedQuery.trim().length < 2) { setResults([]); return; }

        let cancelled = false;
        setSearchLoading(true);

        google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: debouncedQuery,
            sessionToken: tokenRef.current ?? undefined,
        })
            .then(({ suggestions }) => {
                if (cancelled) return;
                setSearchLoading(false);
                setResults(
                    suggestions.slice(0, 6).map((s) => ({
                        placeId: s.placePrediction.placeId,
                        main: s.placePrediction.mainText.text,
                        secondary: s.placePrediction.secondaryText.text,
                        emoji: emojiForTypes(s.placePrediction.types),
                    }))
                );
                setActiveIdx(-1);
            })
            .catch(() => { if (!cancelled) { setSearchLoading(false); setResults([]); } });

        return () => { cancelled = true; };
    }, [debouncedQuery, apiReady, detectState, selected]);

    const pick = (p: Suggestion) => {
        setSelected(p); setQuery(p.main); setResults([]); setFocused(false);
        if (apiReady) tokenRef.current = new google.maps.places.AutocompleteSessionToken();
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!results.length) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && activeIdx >= 0) pick(results[activeIdx]);
        if (e.key === "Escape") { setResults([]); setFocused(false); }
    };

    const showDrop = focused && results.length > 0;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Wrap>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(22px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeUp 0.6s ease both" }}>
                    <Logo />
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, fontFamily: "'Playfair Display',serif", fontStyle: "italic", marginTop: 8 }}>Your safe journey begins here</p>
                </div>

                {/* Card */}
                <div style={{ width: "100%", maxWidth: 520, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "28px", boxShadow: "0 32px 80px rgba(0,0,0,0.45)", animation: "fadeUp 0.7s ease 0.1s both" }}>

                    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 }}>Starting Point</p>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 20 }}>Where are you starting from?</p>

                    {/* ── DETECTING ── */}
                    {detectState === "detecting" && (
                        <div style={{ animation: "fadeUp 0.4s ease both" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 16, padding: "18px" }}>
                                <div style={{ width: 42, height: 42, borderRadius: "50%", border: "2.5px solid rgba(192,132,252,0.2)", borderTopColor: "#c084fc", animation: "spin 0.9s linear infinite", flexShrink: 0 }} />
                                <div>
                                    <div style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>Detecting your location…</div>
                                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 3 }}>Please allow location access if prompted</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetectState("manual")}
                                style={{ marginTop: 14, width: "100%", padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
                                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)"; }}
                                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
                            >
                                ✏️ Type manually instead
                            </button>
                        </div>
                    )}

                    {/* ── DETECTED ── */}
                    {detectState === "detected" && detected && (
                        <div style={{ animation: "fadeUp 0.4s ease both" }}>
                            {/* Location card */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, padding: "18px", marginBottom: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,rgba(16,185,129,0.25),rgba(16,185,129,0.08))", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📍</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s ease infinite" }} />
                                        <span style={{ color: "#10b981", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>Location detected</span>
                                    </div>
                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 1 }}>{detected.main}</div>
                                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{detected.secondary}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <button className="btn-primary" onClick={() => onNext(detected)} style={{ marginBottom: 10 }}>
                                Use My Location → {detected.main}
                            </button>
                            <button
                                onClick={() => { setDetectState("manual"); setQuery(""); setSelected(null); setResults([]); }}
                                style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
                                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)"; }}
                                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
                            >
                                ✏️ Search a different starting point
                            </button>
                        </div>
                    )}

                    {/* ── DENIED / ERROR ── */}
                    {detectState === "denied" && (
                        <div style={{ animation: "fadeUp 0.4s ease both" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
                                <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
                                <div>
                                    <div style={{ color: "#f59e0b", fontWeight: 500, fontSize: 13 }}>Location access denied</div>
                                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, marginTop: 2 }}>Please search your starting point manually</div>
                                </div>
                            </div>
                            <button
                                onClick={requestLocation}
                                style={{ width: "100%", padding: "11px", background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 14, color: "#c084fc", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 10, transition: "all 0.15s" }}
                            >
                                🔄 Try again
                            </button>
                            <button
                                className="btn-primary"
                                style={{ background: "rgba(255,255,255,0.07)", boxShadow: "none" }}
                                onClick={() => setDetectState("manual")}
                            >
                                ✏️ Search manually
                            </button>
                        </div>
                    )}

                    {/* ── MANUAL SEARCH ── */}
                    {detectState === "manual" && (
                        <div style={{ animation: "fadeUp 0.3s ease both" }}>
                            {/* Detect again pill */}
                            <button
                                onClick={requestLocation}
                                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 30, padding: "6px 14px", fontSize: 12, color: "#10b981", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 16, transition: "all 0.15s" }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                                Detect my location
                            </button>

                            {/* Search input */}
                            <div style={{ position: "relative" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 11, background: focused ? "rgba(192,132,252,0.06)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${focused ? "rgba(192,132,252,0.55)" : "rgba(255,255,255,0.1)"}`, borderRadius: showDrop ? "15px 15px 0 0" : "15px", padding: "13px 16px", transition: "all 0.2s", boxShadow: focused ? "0 0 0 4px rgba(192,132,252,0.07)" : "none" }}>
                                    {searchLoading ? (
                                        <div style={{ width: 17, height: 17, borderRadius: "50%", border: "2px solid rgba(192,132,252,0.25)", borderTopColor: "#c084fc", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                                    ) : (
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={focused ? "#c084fc" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.2s" }}>
                                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                        </svg>
                                    )}
                                    <input
                                        className="sy-input"
                                        value={query}
                                        onChange={(e) => { const v = e.target.value; setQuery(v); if (selected && v !== selected.main) setSelected(null); }}
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setTimeout(() => setFocused(false), 300)}
                                        onKeyDown={onKey}
                                        placeholder="Search your city or address…"
                                        autoComplete="off"
                                        spellCheck={false}
                                        autoFocus
                                    />
                                    {query && (
                                        <button onClick={() => { setQuery(""); setSelected(null); setResults([]); }} style={{ background: "rgba(255,255,255,0.09)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", flexShrink: 0, fontSize: 13 }}>×</button>
                                    )}
                                </div>

                                {/* Dropdown */}
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

                            {/* Selected badge */}
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
                                <button className="btn-primary" disabled={!selected} onClick={() => selected && onNext(selected)}>
                                    {selected ? `Continue from ${selected.main} →` : "Select Your Starting Point"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p style={{ marginTop: 20, color: "rgba(255,255,255,0.17)", fontSize: 12, animation: "fadeUp 0.7s ease 0.3s both" }}>🛡️ Safety scores powered by ML · Prototype mode</p>
            </div>
        </Wrap>
    );
}
