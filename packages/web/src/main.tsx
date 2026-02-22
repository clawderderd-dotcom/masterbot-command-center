import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import { DashboardProvider } from "./state/DashboardContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DashboardProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DashboardProvider>
  </StrictMode>,
);
