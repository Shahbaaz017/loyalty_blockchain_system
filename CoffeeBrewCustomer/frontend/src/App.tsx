import { Toaster } from "@/components/ui/toaster"; // Assuming these are from your UI lib (e.g., ShadCN)
import { Toaster as Sonner } from "@/components/ui/sonner"; // Assuming these are from your UI lib
import { TooltipProvider } from "@/components/ui/tooltip"; // Assuming these are from your UI lib
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage"; // Path based on your structure
import MenuPage from "./components/MenuPage";   // Path based on your structure
import Index from "./pages/Index";             // This is our Rewards logic container
import NotFound from "./pages/NotFound";       // Path based on your structure
import { usePrivy } from "@privy-io/react-auth";
import './App.css'; // Assuming your main App styles are here

const queryClient = new QueryClient();

const App = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // Attempt to get email, default to null if not available
  const userEmail = (authenticated && user?.email?.address) 
                    ? user.email.address 
                    : (authenticated && user?.google?.email) // Fallback to Google email if primary email not linked
                    ? user.google.email
                    : null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* These Toaster components are from your provided structure, ensure they are correctly used/placed */}
        <Toaster /> 
        <Sonner /> 
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-beige"> {/* Ensure bg-beige is defined in your CSS/Tailwind */}
            <Navbar 
              isAuthenticated={authenticated && ready} // Pass real auth state
              onLogin={login}                         // Pass real login function
              onLogout={logout}                       // Pass real logout function
              userEmail={userEmail}                   // Pass derived user email
            />
            <main className="flex-1 app-content"> {/* Ensure app-content provides appropriate padding/margins */}
              <Routes>
                <Route path="/" element={<HomePage />} /> 
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/rewards" element={<Index />} /> 
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
