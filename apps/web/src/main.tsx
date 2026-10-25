// ** import lib
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// ** import utils
import App from "./App";
import { Providers } from "./providers";
import { ErrorBoundary, initMonitoring } from "./lib/monitoring";
import { ErrorFallback } from "./components/error-fallback";

// ** import styles
import "./index.css";

initMonitoring();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    >
      <BrowserRouter>
        <Providers>
          <App />
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
