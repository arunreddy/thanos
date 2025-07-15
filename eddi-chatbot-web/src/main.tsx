import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/layout/themeProvider";
import { BrowserRouter } from "react-router";
import { AppProvider } from "./AppContext.tsx";
import { ToastProvider } from "./components/ui/Toast";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppProvider>
            <ToastProvider>
              <App />
              <ReactQueryDevtools initialIsOpen={false} />
            </ToastProvider>
          </AppProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
