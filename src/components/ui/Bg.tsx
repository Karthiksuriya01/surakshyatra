// Background orbs + subtle grid overlay
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
