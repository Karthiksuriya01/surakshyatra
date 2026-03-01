import { useState } from "react";
import type { SourcePlace } from "./screens/S0_Source";
import type { Destination, Place } from "./constants/data";
import type { GroupSize } from "./screens/S2b_GroupDuration";
import S0_Source from "./screens/S0_Source";
import S1_Destination from "./screens/S1_Destination";
import S2b_GroupDuration from "./screens/S2b_GroupDuration";
import S2_Preferences from "./screens/S2_Preferences";
import S4_Itinerary from "./screens/S4_Itinerary";
import S5_PlaceDetail from "./screens/S5_PlaceDetail";

type Screen = "source" | "dest" | "groupDuration" | "prefs" | "itinerary" | "detail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("source");
  const [source, setSource] = useState<SourcePlace | null>(null);
  const [dest, setDest] = useState<Destination | null>(null);
  const [groupSize, setGroupSize] = useState<GroupSize>("solo");
  const [days, setDays] = useState(3);
  const [prefs, setPrefs] = useState<string[]>([]);
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
        onNext={(d) => { setDest(d as Destination); setScreen("groupDuration"); }}
        onBack={() => setScreen("source")}
      />
    );

  if (screen === "groupDuration" && dest)
    return (
      <S2b_GroupDuration
        dest={dest}
        onNext={(g, d) => { setGroupSize(g); setDays(d); setScreen("prefs"); }}
        onBack={() => setScreen("dest")}
      />
    );

  if (screen === "prefs" && dest)
    return (
      <S2_Preferences
        dest={dest}
        groupSize={groupSize}
        days={days}
        onNext={(p) => { setPrefs(p); setScreen("itinerary"); }}
        onBack={() => setScreen("groupDuration")}
      />
    );

  if (screen === "itinerary" && dest)
    return (
      <S4_Itinerary
        dest={dest}
        prefs={prefs}
        days={days}
        groupSize={groupSize}
        source={source}
        onPlace={(p) => { setPlace(p); setScreen("detail"); }}
        onBack={() => setScreen("prefs")}
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
