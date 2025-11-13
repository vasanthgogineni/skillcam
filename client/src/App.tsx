import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import TraineeDashboard from "@/pages/TraineeDashboard";
import UploadPage from "@/pages/UploadPage";
import FeedbackPage from "@/pages/FeedbackPage";
import TrainerReview from "@/pages/TrainerReview";
import NotFound from "@/pages/not-found";
import { getAuthUser, saveAuthUser, clearAuthUser, type AuthUser } from "@/lib/auth";

function Router() {
  const [location, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    saveAuthUser(user);
    if (user.role === "trainee") {
      setLocation("/dashboard");
    } else {
      setLocation("/trainer");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearAuthUser();
    setLocation("/");
  };

  return (
    <Switch>
      <Route path="/">
        <LandingPage />
      </Route>
      <Route path="/login">
        <Login onLogin={handleLogin} defaultTab="login" />
      </Route>
      <Route path="/register">
        <Login onLogin={handleLogin} defaultTab="register" />
      </Route>
      <Route path="/dashboard">
        {currentUser?.role === "trainee" ? (
          <TraineeDashboard userName={currentUser.username} userId={currentUser.id} onLogout={handleLogout} />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <p>Please log in as a trainee to access this page.</p>
          </div>
        )}
      </Route>
      <Route path="/upload">
        {currentUser?.role === "trainee" ? (
          <UploadPage userName={currentUser.username} userId={currentUser.id} onLogout={handleLogout} />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <p>Please log in as a trainee to access this page.</p>
          </div>
        )}
      </Route>
      <Route path="/feedback/:id">
        {currentUser ? (
          <FeedbackPage userName={currentUser.username} userId={currentUser.id} onLogout={handleLogout} />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <p>Please log in to access this page.</p>
          </div>
        )}
      </Route>
      <Route path="/trainer">
        {currentUser?.role === "trainer" ? (
          <TrainerReview userName={currentUser.username} userId={currentUser.id} onLogout={handleLogout} />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <p>Please log in as a trainer to access this page.</p>
          </div>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
