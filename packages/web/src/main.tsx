import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import { DashboardProvider } from "./state/DashboardContext";
import { ToastProviderState } from "./components/ui/use-toast";
import { Toaster } from "./components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProviderState>
      <DashboardProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DashboardProvider>
      <Toaster />
    </ToastProviderState>
  </StrictMode>,
);
