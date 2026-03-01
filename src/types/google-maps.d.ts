// Minimal ambient types for the Google Maps Places + Geocoding APIs
// covering exactly what SurakshYatra uses.

declare namespace google.maps {
    function importLibrary(name: string): Promise<unknown>;

    // ── Geocoder ───────────────────────────────────────────────────────────────
    interface LatLngLiteral { lat: number; lng: number; }

    class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
    }

    interface GeocoderAddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
    }

    interface GeocoderResult {
        place_id: string;
        formatted_address: string;
        address_components: GeocoderAddressComponent[];
        types: string[];
    }

    enum GeocoderStatus {
        OK = "OK",
        ZERO_RESULTS = "ZERO_RESULTS",
        ERROR = "ERROR",
        INVALID_REQUEST = "INVALID_REQUEST",
        OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
        REQUEST_DENIED = "REQUEST_DENIED",
        UNKNOWN_ERROR = "UNKNOWN_ERROR",
    }

    class Geocoder {
        geocode(
            request: { location?: LatLngLiteral; placeId?: string; address?: string },
            callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
        ): void;
    }

    namespace places {
        // ── AutocompleteSuggestion (New API) ─────────────────────────────────────

        interface AutocompleteSuggestionRequest {
            input: string;
            sessionToken?: AutocompleteSessionToken;
            language?: string;
            region?: string;
            includedPrimaryTypes?: string[];
        }

        interface FormattableText { text: string; }

        interface PlacePrediction {
            placeId: string;
            text: FormattableText;
            mainText: FormattableText;
            secondaryText: FormattableText;
            types: string[];
        }

        interface Suggestion { placePrediction: PlacePrediction; }

        interface AutocompleteSuggestionResponse { suggestions: Suggestion[]; }

        class AutocompleteSuggestion {
            static fetchAutocompleteSuggestions(
                request: AutocompleteSuggestionRequest
            ): Promise<AutocompleteSuggestionResponse>;
        }

        class AutocompleteSessionToken { }
    }
}
