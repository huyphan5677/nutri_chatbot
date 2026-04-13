import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Bell, Loader2, Mail, Save } from "lucide-react";
import { useState } from "react";

export default function ContactPreferencesPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].contact;
  const [preferences, setPreferences] = useState({
    marketing: false,
    mealPlanReminders: true,
    weeklyDigest: false,
    pushNotifications: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            {text.title}
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
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
        {/* Email Preferences */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                {text.emailNotificationsTitle}
              </h3>
              <p className="text-sm text-gray-500">
                {text.emailNotificationsDescription}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-start justify-between cursor-pointer group">
              <div className="pr-4">
                <span className="block font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {text.mealPlanRemindersTitle}
                </span>
                <span className="block text-sm text-gray-500 mt-1">
                  {text.mealPlanRemindersDescription}
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.mealPlanReminders}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      mealPlanReminders: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="pr-4">
                <span className="block font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {text.weeklyDigestTitle}
                </span>
                <span className="block text-sm text-gray-500 mt-1">
                  {text.weeklyDigestDescription}
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.weeklyDigest}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      weeklyDigest: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-start justify-between cursor-pointer group">
              <div className="pr-4">
                <span className="block font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {text.marketingTitle}
                </span>
                <span className="block text-sm text-gray-500 mt-1">
                  {text.marketingDescription}
                </span>
              </div>
              <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.marketing}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      marketing: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                {text.pushNotificationsTitle}
              </h3>
              <p className="text-sm text-gray-500">
                {text.pushNotificationsDescription}
              </p>
            </div>
          </div>

          <label className="flex items-start justify-between cursor-pointer group">
            <div className="pr-4">
              <span className="block font-medium text-gray-900 group-hover:text-primary transition-colors">
                {text.enablePushTitle}
              </span>
              <span className="block text-sm text-gray-500 mt-1">
                {text.enablePushDescription}
              </span>
            </div>
            <div className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.pushNotifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    pushNotifications: e.target.checked,
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
