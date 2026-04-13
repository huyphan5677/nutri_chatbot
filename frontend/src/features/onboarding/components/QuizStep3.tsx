import { useLocale } from "@/shared/i18n/LocaleContext";
import React from "react";
import { onboardingMessages } from "../onboarding.messages";

interface QuizStep3Props {
  data: string[];
  onChange: (appliances: string[]) => void;
}

export const QuizStep3: React.FC<QuizStep3Props> = ({ data, onChange }) => {
  const { locale } = useLocale();
  const text = onboardingMessages[locale].step3;

  const toggle = (id: string) => {
    if (data.includes(id)) {
      onChange(data.filter((item) => item !== id));
    } else {
      onChange([...data, id]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-center">{text.title}</h2>
      <p className="text-gray-500 text-center text-sm -mt-3">
        {text.description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {text.appliances.map((app) => (
          <button
            key={app.id}
            onClick={() => toggle(app.id)}
            className={`p-5 rounded-2xl border transition-all flex flex-col items-center gap-2
                            ${
                              data.includes(app.id)
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
          >
            <span className="text-3xl">{app.icon}</span>
            <span className="font-medium text-sm">{app.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
