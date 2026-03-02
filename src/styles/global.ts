// ── Global CSS string injected via <style> inside Wrap ───────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital@0;1&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp  {from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn  {from{opacity:0}to{opacity:1}}
  @keyframes float   {0%,100%{transform:translateY(0)}33%{transform:translateY(-14px)}66%{transform:translateY(-7px)}}
  @keyframes dropIn  {from{opacity:0;transform:translateY(-6px) scaleY(0.96)}to{opacity:1;transform:translateY(0) scaleY(1)}}
  @keyframes slideIn {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideUp {from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideRight {from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
  @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes spin    {to{transform:rotate(360deg)}}
  @keyframes pulse   {0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes scaleIn {from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
  @keyframes chatBounce {0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}

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
  .place-card{display:flex;gap:14px;padding:14px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.18s;animation:fadeUp 0.4s ease forwards}
  .place-card:hover{background:rgba(192,132,252,0.07);border-color:rgba(192,132,252,0.25);transform:translateY(-2px)}
  .btn-primary{width:100%;padding:15px;background:#7c3aed;border:none;border-radius:16px;color:#fff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:transform 0.18s,box-shadow 0.18s,opacity 0.18s;letter-spacing:0.02em}
  .btn-primary:not([disabled]):hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(124,58,237,0.5);background:#6d28d9}
  .btn-primary[disabled]{opacity:0.35;cursor:not-allowed;background:#3a2268}
  .back-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:30px;padding:8px 16px;color:rgba(255,255,255,0.7);font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.15s}
  .back-btn:hover{background:rgba(255,255,255,0.11);color:#fff}
  .bar-fill{height:100%;border-radius:99px;transition:width 0.9s cubic-bezier(0.16,1,0.3,1)}

  /* — Map container — */
  .map-container{width:100%;border-radius:20px;overflow:hidden;position:relative}
  .map-container gmp-map{width:100%;height:100%;display:block}

  /* — Activity card (itinerary list) — */
  .activity-card{display:flex;gap:12px;align-items:flex-start;padding:13px 14px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden}
  .activity-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(124,58,237,0.04),transparent);opacity:0;transition:opacity 0.2s}
  .activity-card:hover{border-color:rgba(192,132,252,0.3);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,0.2)}
  .activity-card:hover::before{opacity:1}
  .activity-img{width:64px;height:64px;border-radius:14px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.06)}
  .activity-img-placeholder{width:64px;height:64px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,rgba(124,58,237,0.3),rgba(192,132,252,0.2));display:flex;align-items:center;justify-content:center;font-size:26px}
  .dir-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:20px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);color:#c084fc;font-size:11px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:all 0.15s;text-decoration:none;white-space:nowrap}
  .dir-btn:hover{background:rgba(124,58,237,0.28);border-color:#c084fc}

  /* — Place detail sheet — */
  .place-sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:flex-end;justify-content:center}
  .place-sheet{width:100%;max-width:560px;max-height:88vh;background:#12121a;border-radius:28px 28px 0 0;overflow-y:auto;animation:slideUp 0.38s cubic-bezier(0.16,1,0.3,1) both;border-top:1px solid rgba(255,255,255,0.08);position:relative}
  .place-sheet::-webkit-scrollbar{width:4px}
  .place-sheet::-webkit-scrollbar-track{background:transparent}
  .place-sheet::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
  .sheet-drag-handle{width:36px;height:4px;border-radius:99px;background:rgba(255,255,255,0.15);margin:12px auto 0}

  /* — Chat panel — */
  .chat-fab{position:fixed;bottom:28px;right:20px;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#c084fc);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 24px rgba(124,58,237,0.5);z-index:90;transition:transform 0.2s,box-shadow 0.2s}
  .chat-fab:hover{transform:scale(1.08);box-shadow:0 12px 32px rgba(124,58,237,0.65)}
  .chat-panel{position:fixed;bottom:0;right:0;width:100%;max-width:420px;height:68vh;background:#12121a;border-radius:24px 24px 0 0;border-top:1px solid rgba(255,255,255,0.08);border-left:1px solid rgba(255,255,255,0.06);z-index:95;display:flex;flex-direction:column;animation:slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both}
  .chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
  .chat-messages::-webkit-scrollbar{width:3px}
  .chat-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
  .chat-bubble-user{align-self:flex-end;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:13px;max-width:78%;line-height:1.5}
  .chat-bubble-ai{align-self:flex-start;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);padding:10px 14px;border-radius:18px 18px 18px 4px;font-size:13px;max-width:78%;line-height:1.5}

  /* — Marker number badges — */
  .map-marker-label{background:#7c3aed;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)}

  /* — Skeleton pulser — */
  .skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:gradShift 1.4s ease infinite;border-radius:10px}

  /* — Star rating — */
  .stars{display:inline-flex;gap:2px}
  .star{font-size:13px;color:#f59e0b}
  .star.empty{color:rgba(255,255,255,0.15)}

  /* — Tag pill — */
  .tag-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-size:11px;color:rgba(255,255,255,0.5)}

  /* — Section header — */
  .section-label{font-size:11px;font-weight:600;letter-spacing:0.08em;color:rgba(255,255,255,0.35);text-transform:uppercase}

  /* — AI badge — */
  .ai-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(192,132,252,0.15));border:1px solid rgba(192,132,252,0.25);font-size:11px;color:#c084fc;font-weight:500}

  /* — Review summary — */
  .review-summary{background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:16px;padding:16px}
`;

export default CSS;
