import { Button } from "@/components/ui/Button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuizWizard } from "../../onboarding/components/QuizWizard";
import { profileApi } from "../api/profileApi";

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleQuizComplete = async (data: any) => {
    setIsSubmitting(true);
    try {
      await profileApi.submitOnboarding(data);
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Failed to save profile", error);
      // Handle FastAPI validation errors (detail is an array of {loc, msg, type})
      let msg = "Unknown error";
      const detail = error.response?.data?.detail;
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
      } else if (error.message) {
        msg = error.message;
      }
      alert(`Error saving preferences: ${msg}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    // Navigate to dashboard and force a page reload to re-trigger the
    // MainLayout onboarding check (which will now see diet_mode is set)
    window.location.href = "/dashboard";
  };

  if (isSuccess) {
    return (
      <div className="min-h-full bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 font-serif">
            Setup Complete! 🎉
          </h2>
          <p className="text-gray-500 mb-8">
            Your diet preferences and family information have been saved. Corin
            is now ready to help you plan meals!
          </p>
          <Button
            onClick={handleDone}
            className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            OK, let's start! <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div
        className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
        style={{ minHeight: "600px" }}
      >
        <QuizWizard
          onComplete={handleQuizComplete}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
