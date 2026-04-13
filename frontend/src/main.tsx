import { GoogleOAuthProvider } from "@react-oauth/google";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import "./index.css";
import { LocaleProvider } from "./shared/i18n/LocaleContext";
import { ThemeProvider } from "./shared/theme/ThemeContext";

const getGoogleClientId = () => {
  if (typeof window !== "undefined" && (window as any).ENV?.VITE_GOOGLE_CLIENT_ID) {
    return (window as any).ENV.VITE_GOOGLE_CLIENT_ID;
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId={getGoogleClientId()}
    >
      <ThemeProvider>
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
