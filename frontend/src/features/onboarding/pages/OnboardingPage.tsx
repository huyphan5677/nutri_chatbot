import { Button } from "@/components/ui/Button";
import { AuthModal } from "@/features/auth";
import { useEffect, useState } from "react";
import { QuizStep1 } from "../components/QuizStep1";
import { FamilyMemberData, QuizStep2 } from "../components/QuizStep2";
import { QuizStep3 } from "../components/QuizStep3";

export const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    prefs: { diet_mode: "", budget_level: "" },
    members: [] as FamilyMemberData[],
    appliances: [] as string[],
  });

  const totalSteps = 3;

  useEffect(() => {
    // Scroll the MainLayout's scroll container to top when step changes or modal opens
    const scrollRoot = document.getElementById("scroll-root");
    if (scrollRoot) {
      requestAnimationFrame(() => {
        scrollRoot.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }, [step, showAuthModal]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else {
      // Quiz Finished -> Show Auth Modal
      setShowAuthModal(true);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleLoginSuccess = (token: string) => {
    console.log("Logged in with token:", token);
    console.log("Submitting Quiz Data:", formData);
    alert("Success! Menu would be generated now.");
    // Redirect to Menu Page or Fetch Data
  };

  return (
    <div className="max-w-md mx-auto p-6 flex flex-col min-h-screen">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Header / Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium mb-2 text-gray-500">
          <span>
            Step {step} of {totalSteps}
          </span>
          {step > 1 && (
            <button
              onClick={handleBack}
              className="text-primary hover:underline"
            >
              Back
            </button>
          )}
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 py-4">
        {step === 1 && (
          <QuizStep1
            data={formData.prefs}
            onChange={(val) => setFormData({ ...formData, prefs: val })}
          />
        )}
        {step === 2 && (
          <QuizStep2
            data={formData.members}
            onChange={(val) => setFormData({ ...formData, members: val })}
          />
        )}
        {step === 3 && (
          <QuizStep3
            data={formData.appliances}
            onChange={(val) => setFormData({ ...formData, appliances: val })}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 pb-8">
        <Button
          onClick={handleNext}
          className="w-full h-12 text-lg rounded-2xl shadow-lg shadow-primary/20"
        >
          {step === totalSteps ? "See my Menu" : "Continue"}
        </Button>
      </div>
    </div>
  );
};
