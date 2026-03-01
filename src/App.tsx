import { useState } from "react";
import type { SourcePlace } from "./screens/S0_Source";
import type { Destination, Place } from "./constants/data";
import S0_Source from "./screens/S0_Source";
import S1_Destination from "./screens/S1_Destination";
import S2_Preferences from "./screens/S2_Preferences";
import S3_Days from "./screens/S3_Days";
import S4_Itinerary from "./screens/S4_Itinerary";
import S5_PlaceDetail from "./screens/S5_PlaceDetail";

type Screen = "source" | "dest" | "prefs" | "days" | "itinerary" | "detail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("source");
  const [source, setSource] = useState<SourcePlace | null>(null);
  const [dest, setDest] = useState<Destination | null>(null);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [days, setDays] = useState(3);
  const [place, setPlace] = useState<Place | null>(null);

  if (screen === "source")
    return (
      <S0_Source
        onNext={(s) => { setSource(s); setScreen("dest"); }}
      />
    );

  if (screen === "dest")
    return (
      <S1_Destination
        onNext={(d) => { setDest(d as Destination); setScreen("prefs"); }}
        onBack={() => setScreen("source")}
      />
    );

  if (screen === "prefs" && dest)
    return (
      <S2_Preferences
        dest={dest}
        onNext={(p) => { setPrefs(p); setScreen("days"); }}
        onBack={() => setScreen("dest")}
      />
    );

  if (screen === "days" && dest)
    return (
      <S3_Days
        dest={dest}
        prefs={prefs}
        onNext={(d) => { setDays(d); setScreen("itinerary"); }}
        onBack={() => setScreen("prefs")}
      />
    );

  if (screen === "itinerary" && dest)
    return (
      <S4_Itinerary
        dest={dest}
        prefs={prefs}
        days={days}
        source={source}
        onPlace={(p) => { setPlace(p); setScreen("detail"); }}
        onBack={() => setScreen("days")}
      />
    );

  if (screen === "detail" && place)
    return (
      <S5_PlaceDetail
        place={place}
        onBack={() => setScreen("itinerary")}
      />
    );

  return <S0_Source onNext={(s) => { setSource(s); setScreen("dest"); }} />;
}
