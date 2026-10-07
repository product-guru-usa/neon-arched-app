import { useEffect, useState } from "react";
import PhoneFrame from "./components/PhoneFrame";
import Home, { type GameId } from "./components/Home";
import Merge2048 from "./games/Merge2048";
import TapRush from "./games/TapRush";
import MemoryMatch from "./games/MemoryMatch";
import { unlockAudio } from "./lib/arcade";

type Route = "home" | GameId;

export default function App() {
  const [route, setRoute] = useState<Route>("home");

  // keep hardware back button / browser back inside the app
  useEffect(() => {
    const onPop = () => setRoute("home");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (r: Route) => {
    unlockAudio();
    if (r !== "home") window.history.pushState({ r }, "");
    else if (window.history.state?.r) window.history.back();
    setRoute(r);
  };

  const home = () => go("home");

  return (
    <PhoneFrame>
      <div key={route} className="h-full w-full animate-slide-up">
        {route === "home" && <Home onPlay={(id) => go(id)} />}
        {route === "2048" && <Merge2048 onHome={home} />}
        {route === "taprush" && <TapRush onHome={home} />}
        {route === "memory" && <MemoryMatch onHome={home} />}
      </div>
    </PhoneFrame>
  );
}
