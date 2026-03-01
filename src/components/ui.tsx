import React from "react";
import CSS from "../styles/global";

// ── Background orbs + grid ────────────────────────────────────────────────────

export function Bg() {
    return (
        <>
            <div className="orb" style={{ width: 420, height: 420, background: "#7c3aed", top: "-110px", left: "-110px" }} />
            <div className="orb" style={{ width: 320, height: 320, background: "#0ea5e9", bottom: "-90px", right: "-90px", animationDelay: "3s" }} />
            <div className="orb" style={{ width: 200, height: 200, background: "#ec4899", top: "40%", right: "10%", animationDelay: "1.5s", opacity: 0.18 }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
        </>
    );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export function Wrap({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
            <style>{CSS}</style>
            <Bg />
            <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
        </div>
    );
}

// ── Logo ──────────────────────────────────────────────────────────────────────

export function Logo({ small }: { small?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: small ? 30 : 38, height: small ? 30 : 38, borderRadius: small ? 8 : 11, background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: small ? 15 : 19, boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>🛡️</div>
            <span style={{ fontSize: small ? 17 : 22, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>SurakshYatra</span>
        </div>
    );
}

// ── Back button ───────────────────────────────────────────────────────────────

export function BackBtn({ onClick }: { onClick: () => void }) {
    return (
        <button className="back-btn" onClick={onClick}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
            </svg>
            Back
        </button>
    );
}
