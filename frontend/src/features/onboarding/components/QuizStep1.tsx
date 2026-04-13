import { useLocale } from "@/shared/i18n/LocaleContext";
import React from "react";
import { onboardingMessages } from "../onboarding.messages";

interface UserPrefsData {
  diet_mode: string;
  budget_level: string;
}

interface QuizStep1Props {
  data: UserPrefsData;
  onChange: (data: UserPrefsData) => void;
}

export const QuizStep1: React.FC<QuizStep1Props> = ({ data, onChange }) => {
  const { locale } = useLocale();
  const text = onboardingMessages[locale].step1;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold text-center">{text.title}</h2>
      <p className="text-gray-400 text-center text-sm -mt-5">
        {text.description}
      </p>

      {/* Diet Mode */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {text.preferredDiet}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {text.diets.map((diet) => (
            <button
              key={diet.id}
              onClick={() =>
                onChange({
                  ...data,
                  diet_mode: data.diet_mode === diet.id ? "" : diet.id,
                })
              }
              className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2
                ${
                  data.diet_mode === diet.id
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                }`}
            >
              <span>{diet.icon}</span> {diet.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      {/* <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Budget Level
        </label>
        <div className="flex gap-2">
          {BUDGETS.map((b) => (
            <button
              key={b.id}
              onClick={() =>
                onChange({
                  ...data,
                  budget_level: data.budget_level === b.id ? "" : b.id,
                })
              }
              className={`flex-1 p-4 rounded-xl border text-left transition-all
                ${
                  data.budget_level === b.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{b.icon}</span>
                <span
                  className={`text-sm font-semibold ${data.budget_level === b.id ? "text-primary" : "text-gray-700"}`}
                >
                  {b.label}
                </span>
              </div>
              <p className="text-xs text-gray-400">{b.desc}</p>
            </button>
          ))}
        </div>
      </div> */}
    </div>
  );
};
