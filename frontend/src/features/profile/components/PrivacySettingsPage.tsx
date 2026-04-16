import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Eye, Loader2, Lock, Save } from "lucide-react";
import { useState } from "react";

export default function PrivacySettingsPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].privacy;
  const [preferences, setPreferences] = useState({
    publicProfile: true,
    showCookingStats: true,
    twoFactorAuth: false,
    dataSharing: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-12 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
            {text.title}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm md:text-base">
            {text.subtitle}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors shrink-0 disabled:opacity-70"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {text.saveChanges}
        </button>
      </div>

      <div className="space-y-6">
        {/* Profile Visibility */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500 dark:text-purple-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100">
                {text.profileVisibilityTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {text.profileVisibilityDescription}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-start justify-between cursor-pointer group">
              <div className="pr-4">
                <span className="block font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                  {text.publicProfileTitle}
                </span>
                <span className="block text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {text.publicProfileDescription}
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.publicProfile}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      publicProfile: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="pr-4">
                <span className="block font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                  {text.cookingStatsTitle}
                </span>
                <span className="block text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {text.cookingStatsDescription}
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.showCookingStats}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      showCookingStats: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="pr-4">
                <span className="block font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                  {text.usageDataTitle}
                </span>
                <span className="block text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {text.usageDataDescription}
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.dataSharing}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      dataSharing: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 dark:text-orange-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100">
                {text.accountSecurityTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {text.accountSecurityDescription}
              </p>
            </div>
          </div>

          <label className="flex items-start justify-between cursor-pointer group">
            <div className="pr-4">
              <span className="block font-medium text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                {text.twoFactorTitle}
              </span>
              <span className="block text-sm text-gray-500 dark:text-slate-400 mt-1">
                {text.twoFactorDescription}
              </span>
            </div>
            <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.twoFactorAuth}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    twoFactorAuth: e.target.checked,
                  })
                }
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
