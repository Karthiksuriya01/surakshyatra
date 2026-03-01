// ── Global CSS string injected via <style> inside Wrap ───────────────────────
// Keeping it as a JS string (rather than a .css file) mirrors the original
// design exactly and lets every screen share the same <Wrap> without any
// CSS-module scoping issues.

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital@0;1&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp  {from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn  {from{opacity:0}to{opacity:1}}
  @keyframes float   {0%,100%{transform:translateY(0)}33%{transform:translateY(-14px)}66%{transform:translateY(-7px)}}
  @keyframes dropIn  {from{opacity:0;transform:translateY(-6px) scaleY(0.96)}to{opacity:1;transform:translateY(0) scaleY(1)}}
  @keyframes slideIn {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes spin    {to{transform:rotate(360deg)}}
  @keyframes pulse   {0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes scaleIn {from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}

  .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.35;animation:float 8s ease-in-out infinite;pointer-events:none}
  .sy-input{width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:15px;font-family:'DM Sans',sans-serif;caret-color:#c084fc}
  .sy-input::placeholder{color:rgba(255,255,255,0.3)}
  .result-row{display:flex;align-items:center;gap:12px;padding:11px 16px;margin:2px 6px;border-radius:12px;cursor:pointer;animation:slideIn 0.18s ease forwards;transition:background 0.13s}
  .result-row:hover,.result-row.active{background:rgba(192,132,252,0.09)}
  .pref-chip{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border-radius:40px;cursor:pointer;border:1.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.65);font-size:14px;font-family:'DM Sans',sans-serif;font-weight:500;transition:all 0.18s;user-select:none}
  .pref-chip:hover{border-color:rgba(192,132,252,0.4);background:rgba(192,132,252,0.08);color:#fff}
  .pref-chip.selected{border-color:#c084fc;background:rgba(192,132,252,0.15);color:#fff}
  .day-tab{padding:8px 18px;border-radius:30px;cursor:pointer;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;border:1.5px solid transparent;transition:all 0.18s;white-space:nowrap}
  .day-tab.active{background:rgba(192,132,252,0.18);border-color:#c084fc;color:#fff}
  .day-tab.inactive{background:transparent;border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.45)}
  .day-tab.inactive:hover{border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.7)}
  .place-card{display:flex;gap:14px;padding:16px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.18s;animation:fadeUp 0.4s ease forwards}
  .place-card:hover{background:rgba(192,132,252,0.07);border-color:rgba(192,132,252,0.25);transform:translateY(-2px)}
  .btn-primary{width:100%;padding:15px;background:#7c3aed;border:none;border-radius:16px;color:#fff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:transform 0.18s,box-shadow 0.18s,opacity 0.18s;letter-spacing:0.02em}
  .btn-primary:not([disabled]):hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(124,58,237,0.5);background:#6d28d9}
  .btn-primary[disabled]{opacity:0.35;cursor:not-allowed;background:#3a2268}
  .back-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:30px;padding:8px 16px;color:rgba(255,255,255,0.7);font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.15s}
  .back-btn:hover{background:rgba(255,255,255,0.11);color:#fff}
  .bar-fill{height:100%;border-radius:99px;transition:width 0.9s cubic-bezier(0.16,1,0.3,1)}
`;

export default CSS;
