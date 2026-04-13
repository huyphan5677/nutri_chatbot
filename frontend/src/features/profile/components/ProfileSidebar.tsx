import {
  AppWindow,
  CreditCard,
  Gift,
  Home,
  Mail,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import { profileMessages } from "@/features/profile/profile.messages";
import { useLocale } from "@/shared/i18n/LocaleContext";
import React, { useEffect, useRef } from "react";

interface ProfileSidebarProps {
  activeTab: number;
  onTabChange: (index: number) => void;
  userName?: string;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  activeTab,
  onTabChange,
  userName,
}) => {
  const { locale } = useLocale();
  const text = profileMessages[locale].sidebar;
  const menuItems = [
    { icon: User, label: text.myProfile },
    { icon: Home, label: text.familyKitchen },
    { icon: CreditCard, label: text.myAccounts },
    { icon: ShoppingBag, label: text.shoppingHistory },
    { icon: Gift, label: text.rewards },
    { icon: ShieldCheck, label: text.privacy },
    { icon: AppWindow, label: text.display },
    { icon: Mail, label: text.contact },
  ];

  const displayInitial = userName ? userName[0].toLowerCase() : "n";
  const displayName = userName || text.userFallback;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (window.innerWidth < 768 && scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.children[
        activeTab
      ] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeTab]);

  return (
    <div className="w-full md:w-64 bg-white dark:bg-slate-900 md:h-[calc(100vh-64px)] md:border-r border-gray-100 dark:border-slate-800 flex flex-col md:sticky md:top-16 z-10 shrink-0 border-b md:border-b-0 shadow-sm md:shadow-none transition-colors duration-300">
      <div className="p-4 md:p-6 text-center border-b border-gray-50 dark:border-slate-800 flex items-center md:flex-col gap-4 md:gap-0">
        <div className="w-12 h-12 md:w-20 md:h-20 bg-orange-100/50 dark:bg-orange-900/20 rounded-full flex items-center justify-center shrink-0 md:mb-3 md:mx-auto">
          <span className="text-xl md:text-3xl font-bold text-orange-500 font-serif">
            {displayInitial}
          </span>
        </div>
        <div className="text-left md:text-center">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg md:text-base">
            {displayName}
          </h3>
          <div className="flex gap-2 mt-1 md:mt-2 text-xs text-gray-500 dark:text-gray-400 justify-start md:justify-center">
            <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 md:py-1 rounded-full border border-gray-200 dark:border-slate-700">
              {text.followers}
            </span>
            <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 md:py-1 rounded-full border border-gray-200 dark:border-slate-700">
              {text.following}
            </span>
          </div>
        </div>
      </div>

      <nav
        ref={scrollContainerRef}
        className="flex flex-row md:flex-col overflow-x-auto overflow-y-hidden md:overflow-x-hidden md:overflow-y-auto w-full md:w-auto flex-1 md:py-4 invisible-scrollbar border-b md:border-b-0"
      >
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onTabChange(idx)}
            className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-3 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal shrink-0 w-auto md:w-full
                        ${
                          activeTab === idx
                            ? "bg-red-50 dark:bg-red-900/10 text-[#FF5C5C] md:border-r-2 md:border-b-0 border-b-2 border-[#FF5C5C]"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white border-b-2 md:border-b-0 border-transparent"
                        }
                        `}
          >
            <item.icon
              className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === idx ? "text-[#FF5C5C]" : "text-gray-400"}`}
            />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
