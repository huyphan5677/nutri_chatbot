import { getApiUrl } from "@/shared/api/client";
import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { locale } = useLocale();
  const t = profileMessages[locale].myAccounts.changePasswordModal;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setIsSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (newPassword.length < 6) {
      setError(t.errorTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.errorMismatch);
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("nutri_token");
      const res = await fetch(`${getApiUrl()}/auth/password`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg =
          typeof data.detail === "string" ? data.detail : t.errorWrong;
        setError(msg);
        return;
      }

      // Success
      setToast(t.successToast);
      setIsSuccess(true);
      setTimeout(() => {
        setToast(null);
        handleClose();
      }, 2000);
    } catch {
      setError(t.errorWrong);
    } finally {
      setIsSaving(false);
    }
  };

  const overlayRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl shadow-xl px-5 py-4 text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5 max-w-xs transition-all">
            <span className="text-lg">✅</span>
            {toast}
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === overlayRef.current) handleClose();
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400 flex-shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {t.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {isSuccess ? (
            <div className="py-10 flex flex-col items-center justify-center text-center animate-in zoom-in-50 duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t.successToast}
              </h3>
            </div>
          ) : (
            <>
              {/* Current Password */}
              <PasswordField
                label={t.currentPassword}
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder={t.currentPlaceholder}
                show={showCurrent}
                onToggle={() => setShowCurrent(!showCurrent)}
              />

              {/* Divider */}
              <div className="h-px bg-gray-100 dark:bg-slate-800" />

              {/* New Password */}
              <PasswordField
                label={t.newPassword}
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t.newPlaceholder}
                show={showNew}
                onToggle={() => setShowNew(!showNew)}
              />

              {/* Confirm Password */}
              <PasswordField
                label={t.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t.confirmPlaceholder}
                show={showConfirm}
                onToggle={() => setShowConfirm(!showConfirm)}
              />

              {/* Strength indicator for new password */}
              {newPassword.length > 0 && (
                <PasswordStrength password={newPassword} />
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="flex items-center gap-3 px-6 pb-6">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.saving}
                </>
              ) : (
                t.save
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pr-10 pl-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 6,
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9!@#$%^&*]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const bars = [
    strength >= 1 ? (strength <= 1 ? "bg-red-400" : strength <= 2 ? "bg-amber-400" : "bg-emerald-400") : "bg-gray-200 dark:bg-slate-700",
    strength >= 2 ? (strength <= 2 ? "bg-amber-400" : "bg-emerald-400") : "bg-gray-200 dark:bg-slate-700",
    strength >= 3 ? "bg-emerald-400" : "bg-gray-200 dark:bg-slate-700",
    strength >= 4 ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700",
  ];
  const label = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const labelColor = ["", "text-red-500", "text-amber-500", "text-emerald-500", "text-emerald-600"][strength];

  return (
    <div className="flex items-center gap-2">
      {bars.map((cls, i) => (
        <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${cls}`} />
      ))}
      <span className={`text-xs font-semibold w-12 text-right ${labelColor}`}>{label}</span>
    </div>
  );
}
