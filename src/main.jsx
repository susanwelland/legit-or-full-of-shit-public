import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Home from "./Home.jsx";
import A11yBar from "./A11y.jsx";
import { readRoute, writeRoute } from "./route.js";
import "./styles.css";
import { startAnalytics } from "./analytics.js";

startAnalytics();

function Root() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const back = () => setRoute(readRoute());
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  const go = (next) => {
    writeRoute(next, true);
    setRoute(next);
    window.scrollTo(0, 0);
  };
  return (
    <>
      <A11yBar />
      {route.page === "home" ? <Home go={go} /> : <App key={`${route.state}:${route.view}:${route.issue || ""}`} route={route} go={go} />}
    </>
  );
}

window.__lofsMounted = true;
createRoot(document.getElementById("root")).render(<Root />);
