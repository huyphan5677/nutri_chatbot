import { useLocale } from "@/shared/i18n/LocaleContext";
import { useTheme } from "@/shared/theme/ThemeContext";
import { profileMessages } from "@/features/profile/profile.messages";
import { Check, Globe, Moon, Sun } from "lucide-react";
import { useState } from "react";

export default function DisplaySettingsPage() {
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const text = profileMessages[locale].display;
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const language = locale === "vi" ? "Tiếng Việt" : "English";

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm md:text-base mb-8">
          {text.description}
        </p>

        <div className="space-y-8">
          {/* Language Selection */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100">{text.languageTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {text.languageDescription}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[
                { label: "English", value: "en" as const },
                { label: "Tiếng Việt", value: "vi" as const },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => void setLocale(value)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    language === label
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  {language === label && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100">{text.themeTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {text.themeDescription}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[
                { key: "light" as const, label: text.themeLight, icon: Sun },
                { key: "dark" as const, label: text.themeDark, icon: Moon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === key
                      ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Measurement Units */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500 dark:text-green-400">
                <div className="font-serif font-bold italic text-lg opacity-80">
                  g
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100">{text.unitsTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {text.unitsDescription}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[
                { key: "metric" as const, label: text.metric, detail: text.metricDetail },
                {
                  key: "imperial" as const,
                  label: text.imperial,
                  detail: text.imperialDetail,
                },
              ].map(({ key, label, detail }) => (
                <button
                  key={key}
                  onClick={() => setUnits(key)}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                    units === key
                      ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex w-full justify-between items-center mb-1">
                    <span
                      className={`font-medium ${units === key ? "text-primary dark:text-primary" : "text-gray-900 dark:text-slate-100"}`}
                    >
                      {label}
                    </span>
                    {units === key && <Check className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-sm ${units === key ? "text-primary/70 dark:text-primary/70" : "text-gray-500 dark:text-slate-400"}`}
                  >
                    {detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
