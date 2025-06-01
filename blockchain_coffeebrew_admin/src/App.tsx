// frontend/admin_dashboard_structure.txt/src/App.tsx
import { Toaster } from "@/components/ui/toaster"; // Assuming path alias @ is set up
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Good for debugging react-query
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import IndexPage from "./pages/Index"; // Assuming this is your current Index.tsx
import NotFoundPage from "./pages/NotFound";
import { CoffeeShopAdminDashboard } from "./components/CoffeeShopAdminDashboard"; // Import the dashboard

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: personal preference
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner /> {/* If you use both, ensure they don't overlap visually */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} /> 
          <Route path="/admin" element={<CoffeeShopAdminDashboard />} /> {/* Admin Dashboard Route */}
          {/* Or make admin the default: <Route path="/" element={<CoffeeShopAdminDashboard />} /> */}
          {/* <Route path="/" element={<Navigate to="/admin" replace />} /> */} {/* Alternative: Redirect / to /admin */}
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    <ReactQueryDevtools initialIsOpen={false} /> {/* Devtools for react-query */}
  </QueryClientProvider>
);

export default App;