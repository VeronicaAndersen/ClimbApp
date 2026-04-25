import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Theme } from "@radix-ui/themes";
import { initializeAuth } from "./lib/apiClient";

initializeAuth().then(() => {
  createRoot(document.getElementById("root")!).render(
    <Theme>
      <App />
    </Theme>
  );
});
