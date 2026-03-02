// App logo mark + wordmark
export function Logo({ small }: { small?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: small ? 30 : 38, height: small ? 30 : 38, borderRadius: small ? 8 : 11, background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: small ? 15 : 19, boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>🛡️</div>
            <span style={{ fontSize: small ? 17 : 22, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>SurakshYatra</span>
        </div>
    );
}
