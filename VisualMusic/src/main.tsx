import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SkinProvider } from "./skins/skins";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SkinProvider>
      <App />
    </SkinProvider>
  </React.StrictMode>,
);
