import { Button } from "@/components/ui/Button";
import { authModalCopy } from "@/features/auth/components/authModal.messages";
import { getApiUrl } from "@/shared/api/client";
import {
  getInitialLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/shared/i18n/locale";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { useGoogleLogin } from "@react-oauth/google";
import { AlertCircle } from "lucide-react";
import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string) => void;
  initialMode?: "login" | "signup";
  locale?: SupportedLocale;
  onLocaleChange?: (locale: SupportedLocale) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = "login",
  locale,
  onLocaleChange,
}) => {
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const { locale: contextLocale, setLocale: setContextLocale } = useLocale();
  const [internalLocale, setInternalLocale] = useState<SupportedLocale>(getInitialLocale);

  React.useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === "login");
      setAuthError("");
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const currentLocale = locale ?? contextLocale ?? internalLocale;
  const setLocale = (nextLocale: SupportedLocale) => {
    setAuthError("");
    if (onLocaleChange) {
      onLocaleChange(nextLocale);
      return;
    }
    void setContextLocale(nextLocale);
    setInternalLocale(nextLocale);
  };
  const text = authModalCopy[currentLocale];

  const handleLoginSuccess = (token: string) => {
    // Save to LocalStorage
    localStorage.setItem("nutri_token", token);
    onLoginSuccess(token);
    setAuthError("");
    onClose();
  };

  const normalizeAuthError = (message?: string) => {
    const msg = (message || "").toLowerCase();
    if (
      msg.includes("incorrect") ||
      msg.includes("password") ||
      msg.includes("credential")
    ) {
      return text.incorrectCredentials;
    }
    return message || text.loginFailed;
  };

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!isLogin && !trimmedName) {
      return text.fullNameRequired;
    }

    if (!trimmedEmail) {
      return text.emailRequired;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      return text.emailInvalid;
    }

    if (!password) {
      return text.passwordRequired;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const validationError = validateForm();
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin
        ? `${getApiUrl()}/auth/login`
        : `${getApiUrl()}/auth/register`;

      let body;
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept-Language": currentLocale,
      };

      if (isLogin) {
        // OAuth2PasswordRequestForm expects form-data
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        body = formData;
        headers = { "Accept-Language": currentLocale };
      } else {
        body = JSON.stringify({
          email: email.trim(),
          password,
          full_name: name.trim() || text.defaultName,
        });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body:
          body instanceof FormData
            ? (() => {
                body.set("username", email.trim());
                return body;
              })()
            : body,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || text.authFailed);
      }

      const data = await res.json();
      handleLoginSuccess(data.access_token);
    } catch (error: any) {
      console.error("Auth error", error);
      setAuthError(normalizeAuthError(error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (accessToken: string) => {
    setAuthError("");
    setLoading(true);
    try {
      console.log("Verifying Google Token with Backend...");

      const res = await fetch(`${getApiUrl()}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": currentLocale,
        },
        body: JSON.stringify({ token: accessToken }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || text.googleAuthFailed);
      }

      const data = await res.json();
      console.log("Backend Auth Success:", data);

      // Use common handler to save token and redirect
      handleLoginSuccess(data.access_token);
      // onClose() is called inside handleLoginSuccess
    } catch (error: any) {
      console.error("Google Auth Error", error);
      setAuthError(normalizeAuthError(error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 sm:py-8 overflow-y-auto invisible-scrollbar">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md p-6 sm:px-8 sm:py-7 relative shadow-2xl animate-in fade-in zoom-in duration-200 my-auto shrink-0 max-h-full overflow-y-auto invisible-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label={text.close}
        >
          X
        </button>

        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            {text.languageLabel}
          </span>
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
            {SUPPORTED_LOCALES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  currentLocale === option
                    ? "bg-white text-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? text.welcome : text.joinNutri}
          </h2>
          <p className="text-gray-500">
            {isLogin ? text.loginSubtitle : text.signupSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {authError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {text.fullName}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (authError) setAuthError("");
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder={text.fullNamePlaceholder}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {text.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (authError) setAuthError("");
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder={text.emailPlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {text.password}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) setAuthError("");
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="********"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 sm:h-12 text-lg rounded-xl mt-5 shadow-lg shadow-primary/20"
          >
            {loading ? text.processing : isLogin ? text.login : text.signup}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">{text.divider}</span>
          </div>
        </div>

        <GoogleLoginButton
          onSuccess={handleGoogleSuccess}
          onError={() => setAuthError(text.googleError)}
          label={text.continueWithGoogle}
        />

        <div className="mt-5 text-center">
          <p className="text-gray-600">
            {isLogin ? `${text.noAccount} ` : `${text.hasAccount} `}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setAuthError("");
              }}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? text.switchToSignup : text.switchToLogin}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const GoogleLoginButton = ({
  onSuccess,
  onError,
  label,
}: {
  onSuccess: (token: string) => void;
  onError: () => void;
  label: string;
}) => {
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => onSuccess(tokenResponse.access_token),
    onError: onError,
  });

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12 text-lg font-medium text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-3 justify-center rounded-xl"
      onClick={() => login()}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </Button>
  );
};
