import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Home,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  OnboardingInitialData,
  QuizWizard,
} from "../../onboarding/components/QuizWizard";
import { profileApi } from "../api/profileApi";

type LoadStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

// Summary card shown after save
const DIET_LABELS: Record<string, string> = {
  balanced: "⚖️ Balanced",
  vegetarian: "🥬 Vegetarian",
  vegan: "🌱 Vegan",
  keto: "🥑 Keto",
  pescetarian: "🐟 Pescetarian",
  paleo: "🦴 Paleo",
};
const BUDGET_LABELS: Record<string, string> = {
  low: "💰 Budget-friendly",
  medium: "⚖️ Moderate",
  high: "✨ Premium",
};

interface SummaryBadgeProps {
  label: string;
  color: string;
}
const SummaryBadge: React.FC<SummaryBadgeProps> = ({ label, color }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}
  >
    {label}
  </span>
);

// Main Component
const HouseholdSetupPage: React.FC = () => {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [initialData, setInitialData] = useState<OnboardingInitialData | null>(
    null,
  );
  const [savedData, setSavedData] = useState<OnboardingInitialData | null>(
    null,
  );

  const loadData = async () => {
    setLoadStatus("loading");
    try {
      const data = await profileApi.getOnboarding();
      setInitialData(data);
      setSavedData(data);
      setLoadStatus("ready");
    } catch {
      setLoadStatus("error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (payload: any) => {
    setSaveStatus("saving");
    try {
      const updated = await profileApi.updateOnboarding(payload);
      setSavedData(updated);
      setInitialData(updated);
      setSaveStatus("success");
      // Auto-reset after 3 seconds so user can edit again
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Loading State
  if (loadStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading your household settings…</p>
      </div>
    );
  }

  // Error State
  if (loadStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">
          Couldn't load your settings
        </p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  // Success Toast (shown 3 s)
  const SuccessToast = saveStatus === "success" && (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-green-900/20 animate-in slide-in-from-bottom-4 duration-300">
      <CheckCircle2 className="w-5 h-5" />
      <span className="text-sm font-semibold">Changes saved!</span>
    </div>
  );

  const ErrorToast = saveStatus === "error" && (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-red-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-red-900/20 animate-in slide-in-from-bottom-4 duration-300">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm font-semibold">
        Save failed. Please try again.
      </span>
    </div>
  );

  // Main edit UI
  return (
    <>
      {SuccessToast}
      {ErrorToast}

      <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
        {/* Page Header */}
        <div className="mb-8">
          {/* Quick summary chips (show current saved state) */}
          {savedData && (
            <div className="flex flex-wrap gap-2 mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 w-full mb-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Current Settings
                </span>
              </div>
              {savedData.diet_mode && (
                <SummaryBadge
                  label={
                    DIET_LABELS[savedData.diet_mode] || savedData.diet_mode
                  }
                  color="bg-green-50 text-green-700 border border-green-100"
                />
              )}
              {savedData.budget_level && (
                <SummaryBadge
                  label={
                    BUDGET_LABELS[savedData.budget_level] ||
                    savedData.budget_level
                  }
                  color="bg-blue-50 text-blue-700 border border-blue-100"
                />
              )}
              {savedData.members && savedData.members.length > 0 && (
                <SummaryBadge
                  label={`👨‍👩‍👧 ${savedData.members.length} member${savedData.members.length > 1 ? "s" : ""}`}
                  color="bg-purple-50 text-purple-700 border border-purple-100"
                />
              )}
              {savedData.equipment && savedData.equipment.length > 0 && (
                <SummaryBadge
                  label={`🍳 ${savedData.equipment.length} appliance${savedData.equipment.length > 1 ? "s" : ""}`}
                  color="bg-orange-50 text-orange-700 border border-orange-100"
                />
              )}
            </div>
          )}
        </div>

        {/* Cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: ChefHat,
              color: "bg-amber-50 text-amber-600",
              title: "Diet & Budget",
              desc: "Choose your preferred diet mode and budget",
            },
            {
              icon: Users,
              color: "bg-purple-50 text-purple-600",
              title: "Family Members",
              desc: "Goals, allergies & health info per member",
            },
            {
              icon: Home,
              color: "bg-orange-50 text-orange-600",
              title: "Kitchen Appliances",
              desc: "Tell us what equipment you have",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}
              >
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {card.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Wizard container — re-mounted with key={JSON} so it resets when save succeeds */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 pt-6 pb-0 border-b border-gray-50">
            <div className="flex items-center gap-2 pb-4">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-gray-700">
                Edit Settings
              </span>
              <span className="ml-auto text-xs text-gray-400">
                Changes are saved when you complete all 3 steps
              </span>
            </div>
          </div>

          <div style={{ minHeight: "560px" }}>
            <QuizWizard
              key={JSON.stringify(initialData)}
              initialData={initialData || undefined}
              onComplete={handleSave}
              isSubmitting={saveStatus === "saving"}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default HouseholdSetupPage;
