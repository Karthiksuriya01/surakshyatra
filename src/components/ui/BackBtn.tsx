// Back navigation button
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
