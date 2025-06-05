import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

if (import.meta.env.VITE_APPINSIGHTS_INSTRUMENTATIONKEY) {
  const appInsights = new ApplicationInsights({
    config: {
      instrumentationKey: import.meta.env.VITE_APPINSIGHTS_INSTRUMENTATIONKEY,
      enableAutoRouteTracking: true,
    }
  });
  appInsights.loadAppInsights();
}

createRoot(document.getElementById("root")!).render(<App />);
