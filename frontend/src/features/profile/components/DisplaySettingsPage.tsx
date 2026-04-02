import { Check, Globe, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

export default function DisplaySettingsPage() {
  const [language, setLanguage] = useState("English");
  const [theme, setTheme] = useState("System");
  const [units, setUnits] = useState("Metric");

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          Display Settings
        </h2>
        <p className="text-gray-500 text-sm md:text-base mb-8">
          Customize how Nutri looks and feels on your device.
        </p>

        <div className="space-y-8">
          {/* Language Selection */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Language</h3>
                <p className="text-sm text-gray-500">
                  Choose your preferred language
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {["English", "Tiếng Việt"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    language === lang
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{lang}</span>
                  {language === lang && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selection */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">App Theme</h3>
                <p className="text-sm text-gray-500">
                  Adjust the visual appearance
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {[
                { name: "Light", icon: Sun },
                { name: "Dark", icon: Moon },
                { name: "System", icon: Monitor },
              ].map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => setTheme(name)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === name
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium text-sm">{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Measurement Units */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                <div className="font-serif font-bold italic text-lg opacity-80">
                  g
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Measurement Units</h3>
                <p className="text-sm text-gray-500">
                  For recipes and shopping lists
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[
                { name: "Metric", detail: "g, ml, °C" },
                { name: "Imperial", detail: "oz, cups, °F" },
              ].map(({ name, detail }) => (
                <button
                  key={name}
                  onClick={() => setUnits(name)}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                    units === name
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex w-full justify-between items-center mb-1">
                    <span
                      className={`font-medium ${units === name ? "text-primary" : "text-gray-900"}`}
                    >
                      {name}
                    </span>
                    {units === name && <Check className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-sm ${units === name ? "text-primary/70" : "text-gray-500"}`}
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
