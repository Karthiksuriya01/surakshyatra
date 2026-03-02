import { useState } from "react";
import type { SourcePlace, GroupSize } from "./types/trip";
import type { Destination, Place } from "./constants/data";
import Source from "./pages/Source";
import DestinationPage from "./pages/Destination";
import GroupDuration from "./pages/GroupDuration";
import Preferences from "./pages/Preferences";
import Itinerary from "./pages/Itinerary";
import PlaceDetail from "./pages/PlaceDetail";

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
    return <Source onNext={(s) => { setSource(s); setScreen("dest"); }} />;

  if (screen === "dest")
    return <DestinationPage onNext={(d: Destination) => { setDest(d); setScreen("groupDuration"); }} onBack={() => setScreen("source")} />;

  if (screen === "groupDuration" && dest)
    return <GroupDuration dest={dest} onNext={(g, d) => { setGroupSize(g); setDays(d); setScreen("prefs"); }} onBack={() => setScreen("dest")} />;

  if (screen === "prefs" && dest)
    return <Preferences dest={dest} groupSize={groupSize} days={days} onNext={(p) => { setPrefs(p); setScreen("itinerary"); }} onBack={() => setScreen("groupDuration")} />;

  if (screen === "itinerary" && dest)
    return <Itinerary dest={dest} prefs={prefs} days={days} groupSize={groupSize} source={source} onPlace={(p) => { setPlace(p); setScreen("detail"); }} onBack={() => setScreen("prefs")} />;

  if (screen === "detail" && place)
    return <PlaceDetail place={place} onBack={() => setScreen("itinerary")} />;

  return <Source onNext={(s) => { setSource(s); setScreen("dest"); }} />;
}
