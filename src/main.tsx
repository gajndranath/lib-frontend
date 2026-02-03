import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Security: Validate storage integrity and clear corrupted data
const validateStorageIntegrity = () => {
  try {
    // Check localStorage for data integrity
    const authStorage = localStorage.getItem("auth-storage");
    const studentAuthStorage = localStorage.getItem("student-auth-storage");

    // Validate admin auth
    if (authStorage) {
      try {
        const auth = JSON.parse(authStorage);
        if (
          (auth.state?.accessToken && !auth.state?.admin) ||
          (!auth.state?.accessToken && auth.state?.admin)
        ) {
          console.warn("Admin auth data corrupted - clearing");
          localStorage.removeItem("auth-storage");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("admin");
        }
      } catch (_e) {
        localStorage.removeItem("auth-storage");
      }
    }

    // Validate student auth
    if (studentAuthStorage) {
      try {
        const studentAuth = JSON.parse(studentAuthStorage);
        if (
          (studentAuth.state?.accessToken && !studentAuth.state?.student) ||
          (!studentAuth.state?.accessToken && studentAuth.state?.student)
        ) {
          console.warn("Student auth data corrupted - clearing");
          localStorage.removeItem("student-auth-storage");
          localStorage.removeItem("studentAccessToken");
          localStorage.removeItem("student");
        }
      } catch (_e) {
        localStorage.removeItem("student-auth-storage");
      }
    }
  } catch (error) {
    console.error("Error validating storage:", error);
  }
};

// Run validation on app start
validateStorageIntegrity();

// Register service worker for PWA support (production only)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // Unregister all service workers in development
      if (import.meta.env.DEV) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          registration.unregister();
        }
        console.log("Development mode: Service Workers unregistered");
        return;
      }

      // Register in production only
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((_registration) => {
          console.log("Service Worker registered successfully");
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    } catch (error) {
      console.error("Error managing service workers:", error);
    }
  });
}

// Security: Disable dangerous globals in production
if (import.meta.env.PROD) {
  // Prevent access to eval
  delete (window as unknown as Record<string, unknown>).eval;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
