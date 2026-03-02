import React from "react";
import CSS from "../../styles/global";
import { Bg } from "./Bg";

// Full-page wrapper providing background, fonts and shared CSS
export function Wrap({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
            <style>{CSS}</style>
            <Bg />
            <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
        </div>
    );
}
