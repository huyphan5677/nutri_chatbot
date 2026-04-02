import { getApiUrl } from "@/shared/api/client";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "../../components/ui/Navbar";
import { Footer } from "../../components/ui/Footer";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    // Only check onboarding once on initial load, not on every route change
    if (onboardingChecked) return;

    const checkOnboarding = async () => {
      const token = localStorage.getItem("nutri_token");
      if (!token) {
        setIsLoading(false);
        setOnboardingChecked(true);
        return;
      }

      try {
        const res = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          const isOnOnboardingPage = location.pathname === "/onboarding";

          if (user.diet_mode) {
            // User has completed onboarding
            if (isOnOnboardingPage) {
              navigate("/dashboard", { replace: true });
            }
          } else {
            // User hasn't completed onboarding - force redirect
            if (!isOnOnboardingPage) {
              navigate("/onboarding", { replace: true });
            }
          }
        }
      } catch (e) {
        console.error("Failed to check onboarding status", e);
      } finally {
        setIsLoading(false);
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, [onboardingChecked, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5C5C]"></div>
      </div>
    );
  }

  const isChatPage = location.pathname === "/chat";

  return (
    <div className="flex h-screen bg-[#FFFBF6] flex-col">
      <Navbar />
      <main 
        id="scroll-root"
        className="flex-1 overflow-y-auto bg-[#FFFBF6] relative flex flex-col"
      >
        <div className="flex-1">
          <Outlet />
        </div>
        {!isChatPage && <Footer />}
      </main>
    </div>
  );
}
