import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { KeyRound, LogOut, Shield, Smartphone } from "lucide-react";

export default function MyAccountsPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].myAccounts;

  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 text-sm md:text-base mb-8">
          {text.subtitle}
        </p>

        <div className="space-y-6">
          {/* Linked Logins */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{text.linkedTitle}</h3>
                <p className="text-sm text-gray-500">
                  {text.linkedDescription}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-700 font-serif font-bold italic">
                    G
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Google</p>
                    <p className="text-xs text-gray-500">{text.connected}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">
                  {text.unlink}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Apple</p>
                    <p className="text-xs text-gray-500">{text.notConnected}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  {text.link}
                </button>
              </div>
            </div>
          </div>

          {/* Password & Authentication */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{text.passwordTitle}</h3>
                <p className="text-sm text-gray-500">
                  {text.passwordDescription}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{text.changePassword}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {text.lastUpdated}
                  </p>
                </div>
                <button className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">
                  {text.update}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-red-600 mb-2">{text.dangerZoneTitle}</h3>
            <p className="text-sm text-gray-500 mb-6">
              {text.dangerZoneDescription}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{text.deleteAccount}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {text.deleteAccountDescription}
                </p>
              </div>
              <button className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                {text.delete}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
