"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { MapPin } from "lucide-react";
import { FieldGroup, TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export interface AddressValue {
  addressLine: string;
  addressLine2: string;
  city: string;
  county: string;
  postCode: string;
  countryCode: string;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const EMPTY_ADDRESS: AddressValue = {
  addressLine: "",
  addressLine2: "",
  city: "",
  county: "",
  postCode: "",
  countryCode: "GB",
  googlePlaceId: null,
  latitude: null,
  longitude: null,
};

interface Prediction {
  placePrediction: {
    placeId: string;
    text: { text: string };
    toPlace: () => GooglePlace;
  };
}

interface GooglePlace {
  fetchFields: (options: { fields: string[] }) => Promise<void>;
  addressComponents?: { types: string[]; longText: string; shortText: string }[];
  location?: { lat: () => number; lng: () => number };
  id: string;
}

declare global {
  interface Window {
    __gmapsAutocompletePromise?: Promise<void>;
    google?: {
      maps?: {
        places?: unknown;
      };
    };
  }
}

const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__gmapsAutocompletePromise) return window.__gmapsAutocompletePromise;

  window.__gmapsAutocompletePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&libraries=places&loading=async&callback=__gmapsAutocompleteLoaded`;
    script.async = true;
    (window as unknown as Record<string, () => void>).__gmapsAutocompleteLoaded = () =>
      resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return window.__gmapsAutocompletePromise;
}

function extractComponent(
  place: GooglePlace,
  type: string,
  useShort = false
): string {
  const component = place.addressComponents?.find((c) => c.types.includes(type));
  if (!component) return "";
  return useShort ? component.shortText : component.longText;
}

/**
 * Reusable UK-biased address input. Uses Google Places Autocomplete (New)
 * when NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is configured; otherwise (and
 * always, as a fallback) renders plain manual fields so address entry never
 * breaks when the integration isn't set up yet.
 */
export function AddressAutocomplete({
  value,
  onChange,
  bias,
  className,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  /** Bias suggestions toward the garage's own location, if known. */
  bias?: { latitude: number; longitude: number } | null;
  className?: string;
}) {
  const fieldId = useId();
  const [query, setQuery] = useState(value.addressLine);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const sessionTokenRef = useRef<unknown>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!BROWSER_KEY) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch(() => {
        // Autocomplete just won't be offered; manual entry still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!mapsReady || !input.trim()) {
        setPredictions([]);
        return;
      }
      const places = window.google?.maps?.places as
        | {
            AutocompleteSessionToken: new () => unknown;
            AutocompleteSuggestion: {
              fetchAutocompleteSuggestions: (req: unknown) => Promise<{ suggestions: Prediction[] }>;
            };
          }
        | undefined;
      if (!places) return;

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }

      try {
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["gb"],
          locationBias: bias
            ? {
                center: { lat: bias.latitude, lng: bias.longitude },
                radius: 50000,
              }
            : undefined,
        });
        setPredictions(suggestions ?? []);
        setIsOpen((suggestions ?? []).length > 0);
      } catch {
        setPredictions([]);
      }
    },
    [mapsReady, bias]
  );

  function handleQueryChange(next: string) {
    setQuery(next);
    onChange({ ...value, addressLine: next, googlePlaceId: null });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(next), 300);
  }

  async function handleSelect(prediction: Prediction) {
    setIsOpen(false);
    const place = prediction.placePrediction.toPlace();
    await place.fetchFields({
      fields: ["addressComponents", "location", "id"],
    });

    const addressLine = [
      extractComponent(place, "street_number"),
      extractComponent(place, "route"),
    ]
      .filter(Boolean)
      .join(" ");

    const next: AddressValue = {
      addressLine: addressLine || prediction.placePrediction.text.text,
      addressLine2: "",
      city:
        extractComponent(place, "post_town") ||
        extractComponent(place, "postal_town") ||
        extractComponent(place, "locality"),
      county: extractComponent(place, "administrative_area_level_2"),
      postCode: extractComponent(place, "postal_code"),
      countryCode: extractComponent(place, "country", true) || "GB",
      googlePlaceId: place.id,
      latitude: place.location?.lat() ?? null,
      longitude: place.location?.lng() ?? null,
    };

    setQuery(next.addressLine);
    onChange(next);
    sessionTokenRef.current = null; // fresh token for the next search
  }

  return (
    <div className={cn("space-y-4", className)}>
      <FieldGroup
        label="Address line 1"
        htmlFor={`${fieldId}-line1`}
        required
        hint={mapsReady ? "Start typing to search" : undefined}
      >
        <div className="relative">
          <TextInput
            id={`${fieldId}-line1`}
            icon={MapPin}
            required
            autoComplete="off"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => predictions.length > 0 && setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          />
          {isOpen && predictions.length > 0 ? (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {predictions.map((p) => (
                <li key={p.placePrediction.placeId}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(p)}
                  >
                    {p.placePrediction.text.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </FieldGroup>

      <FieldGroup label="Address line 2" htmlFor={`${fieldId}-line2`}>
        <TextInput
          id={`${fieldId}-line2`}
          value={value.addressLine2}
          onChange={(e) => onChange({ ...value, addressLine2: e.target.value })}
        />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="City" htmlFor={`${fieldId}-city`} required>
          <TextInput
            id={`${fieldId}-city`}
            required
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="County" htmlFor={`${fieldId}-county`}>
          <TextInput
            id={`${fieldId}-county`}
            value={value.county}
            onChange={(e) => onChange({ ...value, county: e.target.value })}
          />
        </FieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="Postcode" htmlFor={`${fieldId}-postcode`} required>
          <TextInput
            id={`${fieldId}-postcode`}
            required
            value={value.postCode}
            onChange={(e) => onChange({ ...value, postCode: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Country" htmlFor={`${fieldId}-country`}>
          <TextInput
            id={`${fieldId}-country`}
            value={value.countryCode}
            onChange={(e) => onChange({ ...value, countryCode: e.target.value.toUpperCase() })}
          />
        </FieldGroup>
      </div>
    </div>
  );
}
