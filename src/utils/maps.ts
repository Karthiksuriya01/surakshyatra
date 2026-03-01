// ── Google Maps JS API loader ─────────────────────────────────────────────────
// Dynamically injects the Maps bootstrap script once and resolves when
// the `places` library is ready. Safe to call concurrently / on HMR.

const API_KEY = "AIzaSyCrP_tgcUj7KxdJpLhm0nzeMwbpmg0cecM";

let _promise: Promise<void> | null = null;

export function loadMapsApi(): Promise<void> {
    if (_promise) return _promise;

    _promise = new Promise<void>((resolve, reject) => {
        // If already available (e.g. after HMR), resolve immediately
        const tryResolve = () => {
            if (
                typeof google !== "undefined" &&
                google.maps &&
                google.maps.places
            ) {
                resolve();
                return true;
            }
            return false;
        };

        if (tryResolve()) return;

        // Inject the tiny Google bootstrap shim
        const g = { key: API_KEY, v: "weekly" };
        // @ts-ignore
        // eslint-disable-next-line
        ; (function (g) { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}); var r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })(g);

        // Now use the shim's importLibrary to load places
        google.maps
            .importLibrary("places")
            .then(() => resolve())
            .catch(reject);
    });

    return _promise;
}

// ── Emoji heuristic from Google place types ───────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
    locality: "📍",
    administrative_area_level_1: "🗺️",
    administrative_area_level_2: "🗺️",
    country: "🌍",
    natural_feature: "🏔️",
    park: "🌿",
    airport: "✈️",
    train_station: "🚆",
    tourist_attraction: "🏛️",
    premise: "🏢",
    beach: "🏖️",
    island: "🏝️",
};

export function emojiForTypes(types: string[] = []): string {
    for (const t of types) {
        if (TYPE_EMOJI[t]) return TYPE_EMOJI[t];
    }
    return "📍";
}
