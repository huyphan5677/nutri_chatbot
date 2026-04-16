import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { KeyRound, LogOut, Shield, Smartphone } from "lucide-react";
import { useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";

export default function MyAccountsPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].myAccounts;
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <>
    <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
          {text.title}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm md:text-base mb-8">
          {text.subtitle}
        </p>

        <div className="space-y-6">
          {/* Linked Logins */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100">{text.linkedTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {text.linkedDescription}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center text-gray-700 dark:text-slate-200 font-serif font-bold italic">
                    G
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">Google</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{text.connected}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-red-500 transition-colors">
                  {text.unlink}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-slate-800 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-500">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">Apple</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{text.notConnected}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  {text.link}
                </button>
              </div>
            </div>
          </div>

          {/* Password & Authentication */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100">{text.passwordTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {text.passwordDescription}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{text.changePassword}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {text.lastUpdated}
                  </p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-medium rounded-lg transition-colors text-sm"
                >
                  {text.update}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">{text.dangerZoneTitle}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              {text.dangerZoneDescription}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">{text.deleteAccount}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {text.deleteAccountDescription}
                </p>
              </div>
              <button className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                {text.delete}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ChangePasswordModal
      isOpen={isPasswordModalOpen}
      onClose={() => setIsPasswordModalOpen(false)}
    />
    </>
  );
}
