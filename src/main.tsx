import { consumeAuthReturn } from "./auth-return";
import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/newsreader/400-italic.css";
import App from "./App";
import "./style.css";
const authReturn = consumeAuthReturn(window.location, (url) =>
  window.history.replaceState(null, "", url),
);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App authReturn={authReturn} />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {});
  });
