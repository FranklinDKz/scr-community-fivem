import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./theme.css";

// Links antigos usavam "/#/rota". Converte para a URL real antes de montar o app.
const legacy = window.location.hash.match(/^#(\/[^?#]*)(\?[^#]*)?$/);
if (legacy) {
  window.history.replaceState(null, "", legacy[1] + (legacy[2] || ""));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
