import { Button } from "@/components/ui/Button";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { onboardingMessages } from "../onboarding.messages";
import { QuizStep1 } from "./QuizStep1";
import { FamilyMemberData, QuizStep2 } from "./QuizStep2";
import { QuizStep3 } from "./QuizStep3";

export interface OnboardingInitialData {
  diet_mode?: string;
  budget_level?: string;
  equipment?: string[];
  members?: Array<{
    id?: string;
    name?: string;
    relationship?: string;
    age?: number | null;
    gender?: string;
    weight_kg?: number | null;
    height_cm?: number | null;
    bmr?: number | null;
    tdee?: number | null;
    primary_goal?: string;
    activity_level?: string;
    health_profile?: {
      allergies?: string[];
      favorite_dishes?: string[];
      conditions?: string[];
    };
  }>;
}

interface QuizWizardProps {
  onComplete: (data: any) => void;
  isSubmitting?: boolean;
  initialData?: OnboardingInitialData;
}

type RequiredMemberField =
  | "name"
  | "relationship"
  | "gender"
  | "age"
  | "weight_kg"
  | "height_cm"
  | "activity_level";

const emptyMember = (): FamilyMemberData => ({
  name: "",
  relationship: "self",
  age: "",
  gender: "",
  weight_kg: "",
  height_cm: "",
  bmr: "",
  tdee: "",
  primary_goal: "",
  primary_goal_other: "",
  activity_level: "",
  favorite_dishes: [],
  allergies: [],
  health_conditions: [],
});

type ApiMember = NonNullable<OnboardingInitialData["members"]>[number];

const PRESET_GOAL_IDS = [
  "lose_weight",
  "gain_weight",
  "maintain",
  "build_muscle",
  "eat_healthier",
];

const memberFromApi = (m: ApiMember): FamilyMemberData => ({
  name: m.name || "",
  relationship: m.relationship || "self",
  age: m.age != null ? String(m.age) : "",
  gender: m.gender || "",
  weight_kg: m.weight_kg != null ? String(m.weight_kg) : "",
  height_cm: m.height_cm != null ? String(m.height_cm) : "",
  bmr: m.bmr != null ? String(m.bmr) : "",
  tdee: m.tdee != null ? String(m.tdee) : "",
  primary_goal: m.primary_goal
    ? PRESET_GOAL_IDS.includes(m.primary_goal)
      ? m.primary_goal
      : "other"
    : "",
  primary_goal_other:
    m.primary_goal && !PRESET_GOAL_IDS.includes(m.primary_goal)
      ? m.primary_goal
      : "",
  activity_level: m.activity_level || "",
  favorite_dishes: m.health_profile?.favorite_dishes || [],
  allergies: m.health_profile?.allergies || [],
  health_conditions: m.health_profile?.conditions || [],
});

export const QuizWizard: React.FC<QuizWizardProps> = ({
  onComplete,
  isSubmitting,
  initialData,
}) => {
  const { locale } = useLocale();
  const pageText = onboardingMessages[locale].page;
  const step1Text = onboardingMessages[locale].step1;
  const step2Text = onboardingMessages[locale].step2;
  const step3Text = onboardingMessages[locale].step3;
  const stepTitles = [step1Text.title, step2Text.title, step3Text.title];
  const [step, setStep] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState(() => ({
    userPrefs: {
      diet_mode: initialData?.diet_mode || "",
      budget_level: initialData?.budget_level || "",
    },
    members:
      initialData?.members && initialData.members.length > 0
        ? initialData.members.map(memberFromApi)
        : ([emptyMember()] as FamilyMemberData[]),
    equipment: initialData?.equipment || ([] as string[]),
  }));
  const [stepError, setStepError] = useState("");
  const [requiredFieldErrors, setRequiredFieldErrors] = useState<
    Partial<Record<RequiredMemberField, boolean>>
  >({});
  
  // Reset scroll to top when step changes
  useEffect(() => {
    // 1. Reset its own internal scrollable div if it exists
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    // 2. Reset the MainLayout's scroll container
    const scrollRoot = document.getElementById("scroll-root");
    if (scrollRoot) {
      requestAnimationFrame(() => {
        scrollRoot.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }, [step, isSubmitting]);

  const totalSteps = 3;

  const validateRequiredMember = () => {
    const firstMember = formData.members[0];
    const errors: Partial<Record<RequiredMemberField, boolean>> = {};

    if (!firstMember || !firstMember.name.trim()) errors.name = true;
    if (!firstMember || !firstMember.relationship.trim())
      errors.relationship = true;
    if (!firstMember || !firstMember.gender.trim()) errors.gender = true;

    const age = firstMember?.age ? Number(firstMember.age) : NaN;
    if (!Number.isFinite(age) || age <= 0) errors.age = true;

    const weight = firstMember?.weight_kg ? Number(firstMember.weight_kg) : NaN;
    if (!Number.isFinite(weight) || weight <= 0) errors.weight_kg = true;

    const height = firstMember?.height_cm ? Number(firstMember.height_cm) : NaN;
    if (!Number.isFinite(height) || height <= 0) errors.height_cm = true;

    if (!firstMember || !firstMember.activity_level.trim()) {
      errors.activity_level = true;
    }

    return errors;
  };

  const handleNext = () => {
    if (step === 2) {
      const errors = validateRequiredMember();
      if (Object.keys(errors).length > 0) {
        setRequiredFieldErrors(errors);
        setStepError(pageText.requiredFirstMemberError);
        return;
      }
      setStepError("");
      setRequiredFieldErrors({});
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      const payload = {
        diet_mode: formData.userPrefs.diet_mode || null,
        budget_level: formData.userPrefs.budget_level || null,
        equipment: formData.equipment,
        members: formData.members.map((m) => ({
          name: m.name || null,
          relationship: m.relationship || null,
          age: m.age ? parseInt(m.age, 10) : null,
          gender: m.gender || null,
          weight_kg: m.weight_kg ? parseFloat(m.weight_kg) : null,
          height_cm: m.height_cm ? parseFloat(m.height_cm) : null,
          bmr: m.bmr ? parseFloat(m.bmr) : null,
          tdee: m.tdee ? parseFloat(m.tdee) : null,
          primary_goal:
            m.primary_goal === "other"
              ? m.primary_goal_other || null
              : m.primary_goal || null,
          activity_level: m.activity_level || null,
          health_profile: {
            allergies: m.allergies,
            favorite_dishes: m.favorite_dishes,
            conditions: m.health_conditions,
          },
        })),
      };
      onComplete(payload);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header / Progress */}
      <div className="mb-6 flex-none">
        <h2 className="text-2xl font-bold text-center mb-1 font-serif text-gray-900">
          {pageText.wizardTitle}
        </h2>
        <p className="text-center text-gray-400 text-sm mb-6">
          {stepTitles[step - 1]}
        </p>
        <div className="flex justify-between text-sm font-medium mb-2 text-gray-500">
          <span>{pageText.stepCounter(step, totalSteps)}</span>
          {step > 1 && (
            <button
              onClick={handleBack}
              className="text-primary hover:underline"
            >
              {pageText.back}
            </button>
          )}
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        {stepError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {stepError}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div 
        ref={contentRef}
        className="flex-1 py-2 overflow-y-auto"
      >
        {step === 1 && (
          <QuizStep1
            data={formData.userPrefs}
            onChange={(val) => setFormData({ ...formData, userPrefs: val })}
          />
        )}
        {step === 2 && (
          <QuizStep2
            data={formData.members}
            onChange={(val) => {
              setFormData({ ...formData, members: val });
              if (stepError) setStepError("");
              if (Object.keys(requiredFieldErrors).length > 0) {
                setRequiredFieldErrors({});
              }
            }}
            requiredFieldErrors={requiredFieldErrors}
          />
        )}
        {step === 3 && (
          <QuizStep3
            data={formData.equipment}
            onChange={(val) => setFormData({ ...formData, equipment: val })}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-4 flex-none">
        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          className="w-full h-12 text-lg rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> {pageText.saving}
            </>
          ) : step === totalSteps ? (
            pageText.saveChanges
          ) : (
            pageText.continue
          )}
        </Button>
      </div>
    </div>
  );
};
