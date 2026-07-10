
  import { createRoot } from "react-dom/client";
  import App from "./App";
  import { AuthProvider } from "./contexts/AuthContext";
  import { Toaster } from "./components/ui/sonner";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  );
