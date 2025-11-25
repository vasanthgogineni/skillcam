import { useEffect, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, getAuthHeaders } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";

import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import TraineeDashboard from "@/pages/TraineeDashboard";
import UploadPage from "@/pages/UploadPage";
import FeedbackPage from "@/pages/FeedbackPage";
import TrainerReview from "@/pages/TrainerReview";
import NotFound from "@/pages/not-found";
import VideoAnalysisResult from "@/pages/VideoAnalysisResult";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthUser } from "./lib/auth";
import { Loader2 } from "lucide-react";

function Router() {
  const [location, setLocation] = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();

  // Fetch user profile from backend
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      if (!headers["Authorization"]) {
        return null;
      }

      const res = await fetch("/api/users/me", {
        headers,
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch user profile: ${res.statusText}`);
      }

      return await res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const currentUser: AuthUser | null =
    user && userProfile
      ? {
          id: user.id,
          username:
            userProfile?.displayName ||
            user.email?.split("@")[0] ||
            "User",
          role: userProfile?.role || "trainee",
        }
      : null;

  const isLoading = authLoading || (!!user && isLoadingProfile);

  // Effect to redirect logged-in users from public pages to their dashboard
  useEffect(() => {
    const handleOAuthRole = async () => {
      const pendingRole = localStorage.getItem("oauth_pending_role");
      if (currentUser && pendingRole) {
        if (currentUser.role !== pendingRole) {
          try {
            const headers = await getAuthHeaders();
            await fetch("/api/users/me", {
              method: "PATCH",
              headers: {
                ...headers,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ role: pendingRole }),
            });
            // Invalidate to refresh role
            await queryClient.invalidateQueries({
              queryKey: ["/api/users/me"],
            });
          } catch (e) {
            console.error("Failed to update role", e);
          }
        }
        localStorage.removeItem("oauth_pending_role");
      }
    };

    handleOAuthRole();

    if (
      !isLoading &&
      currentUser &&
      (location === "/" ||
        location === "/login" ||
        location === "/register")
    ) {
      if (currentUser.role === "trainer") {
        setLocation("/trainer");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [isLoading, currentUser, location, setLocation]);

  const handleLogout = async () => {
    await signOut();
    queryClient.clear();
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {currentUser ? (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <LandingPage />
        )}
      </Route>

      <Route path="/login">
        {currentUser ? (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Login defaultTab="login" />
        )}
      </Route>

      <Route path="/register">
        {currentUser ? (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Login defaultTab="register" />
        )}
      </Route>

      <Route path="/dashboard">
        {!currentUser ? (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>Please log in to access this page.</p>
            <button
              onClick={() => setLocation("/login")}
              className="text-primary underline"
            >
              Go to Login
            </button>
          </div>
        ) : currentUser.role === "trainer" ? (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>This page is for trainees only.</p>
            <button
              onClick={() => setLocation("/trainer")}
              className="text-primary underline"
            >
              Go to Trainer Dashboard
            </button>
          </div>
        ) : (
          <TraineeDashboard
            userName={currentUser.username}
            userId={currentUser.id}
            onLogout={handleLogout}
          />
        )}
      </Route>

      <Route path="/upload">
        {currentUser?.role === "trainee" ? (
          <UploadPage
            userName={currentUser.username}
            userId={currentUser.id}
            onLogout={handleLogout}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>Please log in as a trainee to access this page.</p>
            <button
              onClick={() => setLocation("/login")}
              className="text-primary underline"
            >
              Go to Login
            </button>
          </div>
        )}
      </Route>

      <Route path="/feedback/:id">
        {currentUser ? (
          <FeedbackPage
            userName={currentUser.username}
            userId={currentUser.id}
            onLogout={handleLogout}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>Please log in to access this page.</p>
            <button
              onClick={() => setLocation("/login")}
              className="text-primary underline"
            >
              Go to Login
            </button>
          </div>
        )}
      </Route>

      <Route path="/trainer">
        {currentUser?.role === "trainer" ? (
          <TrainerReview
            userName={currentUser.username}
            userId={currentUser.id}
            onLogout={handleLogout}
          />
        ) : !currentUser ? (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>Please log in as a trainer to access this page.</p>
            <button
              onClick={() => setLocation("/login")}
              className="text-primary underline"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>This page is for trainers only.</p>
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-primary underline"
            >
              Go to Trainee Dashboard
            </button>
          </div>
        )}
      </Route>

      {/* New AI video analysis route */}
      <Route path="/video-analysis">
        {currentUser ? (
          <VideoAnalysisResult />
        ) : (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <p>Please log in to access this page.</p>
            <button
              onClick={() => setLocation("/login")}
              className="text-primary underline"
            >
              Go to Login
            </button>
          </div>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <p>Loading...</p>
                </div>
              }
            >
              <Router />
            </Suspense>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
