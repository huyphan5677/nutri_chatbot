import { KeyRound, LogOut, Shield, Smartphone } from "lucide-react";

export default function MyAccountsPage() {
  return (
    <div className="flex flex-col gap-8 md:gap-12 max-w-3xl">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
          My Accounts
        </h2>
        <p className="text-gray-500 text-sm md:text-base mb-8">
          Manage your login methods and connected services.
        </p>

        <div className="space-y-6">
          {/* Linked Logins */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Linked Accounts</h3>
                <p className="text-sm text-gray-500">
                  Sign in using other providers
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
                    <p className="text-xs text-gray-500">Connected</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">
                  Unlink
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Apple</p>
                    <p className="text-xs text-gray-500">Not connected</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Link
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
                <h3 className="font-bold text-gray-900">Password</h3>
                <p className="text-sm text-gray-500">
                  Update your account security
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated 3 months ago
                  </p>
                </div>
                <button className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm">
                  Update
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-6">
              Irreversible destructive actions for your account.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Delete Account</p>
                <p className="text-sm text-gray-500 mt-1">
                  Permanently remove all data
                </p>
              </div>
              <button className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
