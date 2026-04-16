import { Modal } from "@/components/ui/Modal";
import { profileMessages } from "@/features/profile/profile.messages";
import { getApiUrl } from "@/shared/api/client";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  AlertTriangle,
  KeyRound,
  LogOut,
  Shield,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";

export default function MyAccountsPage() {
  const { locale } = useLocale();
  const text = profileMessages[locale].myAccounts;
  const tDelete = text.deleteAccountModal;

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const token = localStorage.getItem("nutri_token");
      const res = await fetch(`${getApiUrl()}/auth/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Accept-Language": locale,
        },
      });

      if (!res.ok) {
        setDeleteError(tDelete.error);
        return;
      }

      // Success
      localStorage.removeItem("nutri_token");
      window.location.href = "/";
    } catch {
      setDeleteError(tDelete.error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-12 pt-4">
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
                  <h3 className="font-bold text-gray-900 dark:text-slate-100">
                    {text.linkedTitle}
                  </h3>
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
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        Google
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {text.connected}
                      </p>
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
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        Apple
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {text.notConnected}
                      </p>
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
                  <h3 className="font-bold text-gray-900 dark:text-slate-100">
                    {text.passwordTitle}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {text.passwordDescription}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {text.changePassword}
                    </p>
                    {/* <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {text.lastUpdated}
                  </p> */}
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
              <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">
                {text.dangerZoneTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                {text.dangerZoneDescription}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {text.deleteAccount}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {text.deleteAccountDescription}
                  </p>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                >
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

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        className="max-w-md"
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
            {tDelete.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
            {tDelete.description}
          </p>

          {deleteError && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg">
              {deleteError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {tDelete.cancel}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isDeleting ? tDelete.deleting : tDelete.confirm}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
