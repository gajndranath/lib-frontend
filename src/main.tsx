import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Clear any problematic storage on initial load
const clearProblematicStorage = () => {
  try {
    // Check if storage is corrupted
    const token = localStorage.getItem("accessToken");
    const admin = localStorage.getItem("admin");

    if (token && !admin) {
      console.log("Clearing corrupted storage: token without admin");
      localStorage.removeItem("accessToken");
    }

    if (!token && admin) {
      console.log("Clearing corrupted storage: admin without token");
      localStorage.removeItem("admin");
    }
  } catch (error) {
    console.error("Error checking storage:", error);
  }
};

// Run cleanup on app start
clearProblematicStorage();

// Register service worker
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
